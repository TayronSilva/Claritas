import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type AwardTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_CUTOFFS,
  DEFAULT_WEIGHTS,
  coverageForTier,
  resolveTier,
  scoreStudent,
  type ScorableProfile,
  type ScorableStudent,
  type ScoringRule,
} from './scoring.engine';

@Injectable()
export class ScholarshipsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- regra

  async getActiveRule(institutionId: string) {
    const existing = await this.prisma.scoringRuleVersion.findFirst({
      where: { institutionId, isActive: true },
      orderBy: { version: 'desc' },
    });

    if (existing) {
      return {
        version: existing.version,
        label: existing.label,
        weights: existing.weights as unknown as ScoringRule['weights'],
        tierCutoffs: existing.tierCutoffs as unknown as ScoringRule['tierCutoffs'],
      };
    }

    const created = await this.prisma.scoringRuleVersion.create({
      data: {
        institutionId,
        version: 1,
        label: 'Regra inicial',
        weights: DEFAULT_WEIGHTS as unknown as Prisma.InputJsonValue,
        tierCutoffs: DEFAULT_CUTOFFS as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      version: created.version,
      label: created.label,
      weights: DEFAULT_WEIGHTS,
      tierCutoffs: DEFAULT_CUTOFFS,
    };
  }

  async publishRule(
    institutionId: string,
    weights?: Partial<ScoringRule['weights']>,
    cutoffs?: Partial<ScoringRule['tierCutoffs']>,
  ) {
    const current = await this.getActiveRule(institutionId);
    const nextVersion = current.version + 1;

    await this.prisma.scoringRuleVersion.updateMany({
      where: { institutionId, isActive: true },
      data: { isActive: false },
    });

    const created = await this.prisma.scoringRuleVersion.create({
      data: {
        institutionId,
        version: nextVersion,
        label: `Regra v${nextVersion}`,
        weights: { ...current.weights, ...weights } as unknown as Prisma.InputJsonValue,
        tierCutoffs: {
          ...current.tierCutoffs,
          ...cutoffs,
        } as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    return created;
  }

  // ---------------------------------------------------------------- avaliacao

  /** Pontua um aluno sob a regra ativa, sem persistir. Usado no preview. */
  async previewScore(studentId: string) {
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { socialProfile: { include: { priorityFlags: true } } },
    });

    const rule = await this.getActiveRule(student.institutionId);
    return { studentId, rule, result: scoreStudent(this.toScorable(student), rule) };
  }

  /** Pontua e persiste a candidatura de toda a carteira ativa de um periodo. */
  async evaluatePeriod(institutionId: string, period: string) {
    const rule = await this.getActiveRule(institutionId);

    const students = await this.prisma.student.findMany({
      where: { institutionId, status: 'ACTIVE' },
      include: { socialProfile: { include: { priorityFlags: true } } },
    });

    const ruleVersion = await this.prisma.scoringRuleVersion.findFirstOrThrow({
      where: { institutionId, version: rule.version },
    });

    let eligible = 0;
    let ineligible = 0;

    for (const student of students) {
      const scorable = this.toScorable(student);
      const result = scoreStudent(scorable, rule);

      if (!result.eligibility.passed) ineligible++;
      else eligible++;

      await this.prisma.scholarshipApplication.upsert({
        where: {
          studentId_period: { studentId: student.id, period },
        },
        create: {
          studentId: student.id,
          ruleVersionId: ruleVersion.id,
          period,
          totalScore: result.totalScore,
          scoreBreakdown: result.breakdown as unknown as Prisma.InputJsonValue,
          eligibility: result.eligibility.passed ? 'PASS' : 'FAIL',
          status: result.eligibility.passed ? 'ELIGIBLE' : 'INELIGIBLE',
          awardedTier: (result.suggestedTier ?? undefined) as AwardTier | undefined,
          rationale: result.eligibility.reasons.join(' ') || null,
        },
        update: {
          ruleVersionId: ruleVersion.id,
          totalScore: result.totalScore,
          scoreBreakdown: result.breakdown as unknown as Prisma.InputJsonValue,
          eligibility: result.eligibility.passed ? 'PASS' : 'FAIL',
          status: result.eligibility.passed ? 'ELIGIBLE' : 'INELIGIBLE',
          awardedTier: (result.suggestedTier ?? undefined) as AwardTier | undefined,
          rationale: result.eligibility.reasons.join(' ') || null,
        },
      });
    }

    return {
      period,
      ruleVersion: rule.version,
      total: students.length,
      eligible,
      ineligible,
    };
  }

  /** Ranking transparente: pontuacao decrescente, desempate por matricula. */
  async ranking(institutionId: string, period: string) {
    if (!institutionId) {
      throw new BadRequestException('institutionId obrigatorio');
    }

    const applications = await this.prisma.scholarshipApplication.findMany({
      where: { period, student: { institutionId } },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            enrollmentCode: true,
            course: true,
            monthlyFee: true,
          },
        },
      },
      orderBy: [{ totalScore: 'desc' }, { student: { enrollmentCode: 'asc' } }],
    });

    return applications.map((a) => ({
      applicationId: a.id,
      studentId: a.studentId,
      name: a.student.fullName,
      enrollmentCode: a.student.enrollmentCode,
      course: a.student.course,
      monthlyFee: a.student.monthlyFee.toString(),
      totalScore: a.totalScore.toString(),
      eligibility: a.eligibility,
      status: a.status,
      suggestedTier: a.awardedTier,
      breakdown: a.scoreBreakdown,
    }));
  }

  /**
   * Concessao por ordem de pontuacao: concede a maior faixa possivel
   * enquanto houver orcamento. Regra deterministica, sem Favorito.
   */
  async allocate(institutionId: string, period: string, fundId: string) {
    const fund = await this.prisma.fund.findUnique({ where: { id: fundId } });
    if (!fund) throw new NotFoundException('Fundo nao encontrado');

    let available = fund.budget.minus(fund.distributed).minus(fund.reserved);
    const rule = await this.getActiveRule(institutionId);

    const applications = await this.prisma.scholarshipApplication.findMany({
      where: { period, student: { institutionId }, eligibility: 'PASS' },
      include: { student: true },
      orderBy: [{ totalScore: 'desc' }, { student: { enrollmentCode: 'asc' } }],
    });

    const granted: Array<Record<string, unknown>> = [];
    const denied: Array<Record<string, unknown>> = [];

    for (const app of applications) {
      const tier = (app.awardedTier ?? resolveTier(app.totalScore.toNumber(), rule.tierCutoffs)) as AwardTier | null;
      if (!tier) {
        denied.push({ studentId: app.studentId, reason: 'Pontuacao insuficiente' });
        continue;
      }

      const coverage = coverageForTier(tier);
      const wanted = app.student.monthlyFee
        .mul(coverage)
        .div(100)
        .toDecimalPlaces(2);

      // Degrada a faixa se o orcamento nao cobre a faixa cheia.
      let finalTier = tier;
      let value = wanted;

      if (value.gt(available)) {
        const tiers: AwardTier[] = ['A', 'B', 'C', 'D'];
        const idx = tiers.indexOf(tier);
        let degraded = false;

        for (let i = idx + 1; i < tiers.length; i++) {
          const candidate = app.student.monthlyFee
            .mul(coverageForTier(tiers[i]))
            .div(100)
            .toDecimalPlaces(2);

          if (candidate.lte(available) && candidate.gt(0)) {
            finalTier = tiers[i];
            value = candidate;
            degraded = true;
            break;
          }
        }

        if (!degraded) {
          denied.push({
            studentId: app.studentId,
            name: app.student.fullName,
            reason: 'Orcamento do fundo esgotado',
          });
          continue;
        }
      }

      available = available.minus(value);

      const award = await this.prisma.scholarshipAward.create({
        data: {
          applicationId: app.id,
          studentId: app.studentId,
          fundId,
          tier: finalTier,
          coveragePct: coverageForTier(finalTier),
          monthlyValue: value,
          status: 'ACTIVE',
          startsAt: new Date(),
        },
      });

      await this.prisma.scholarshipApplication.update({
        where: { id: app.id },
        data: { status: 'AWARDED', awardedTier: finalTier, decidedAt: new Date() },
      });

      await this.prisma.ledgerEntry.create({
        data: {
          institutionId,
          awardId: award.id,
          type: 'SCHOLARSHIP_PAID',
          direction: 'CREDIT',
          amount: value,
          account: `fundo:${fund.period}`,
          memo: `Bolsa tier ${finalTier} - ${app.student.fullName}`,
        },
      });

      granted.push({
        studentId: app.studentId,
        name: app.student.fullName,
        requestedTier: tier,
        grantedTier: finalTier,
        monthlyValue: value.toString(),
      });
    }

    await this.prisma.fund.update({
      where: { id: fundId },
      data: { reserved: available },
    });

    return {
      fundId,
      period,
      budget: fund.budget.toString(),
      grantedCount: granted.length,
      deniedCount: denied.length,
      remaining: available.toString(),
      granted,
      denied,
    };
  }

  // ---------------------------------------------------------------- helpers

  private toScorable(student: {
    status: string;
    socialProfile: {
      incomePerCapita: unknown;
      householdSize: number;
      dependentsCount: number;
      caresForElderlyOrPwd: boolean;
      overdueChargesCount: number;
      recentIncomeLoss: boolean;
      monthsSinceEnrollment: number | null;
      distanceKmToCampus: unknown;
      transportDifficulty: boolean;
      housingInstability: boolean;
      foodInsecurity: boolean;
      currentGradeAverage: unknown;
      attendancePct: unknown;
      priorityFlags: Array<{ flag: string }> | string[];
    } | null;
  }): ScorableStudent {
    const p = student.socialProfile;
    const flags = p?.priorityFlags ?? [];

    return {
      status: student.status as ScorableStudent['status'],
      socialProfile: p
        ? {
            incomePerCapita: Number(p.incomePerCapita),
            householdSize: p.householdSize,
            dependentsCount: p.dependentsCount,
            caresForElderlyOrPwd: p.caresForElderlyOrPwd,
            overdueChargesCount: p.overdueChargesCount,
            recentIncomeLoss: p.recentIncomeLoss,
            monthsSinceEnrollment: p.monthsSinceEnrollment,
            distanceKmToCampus: p.distanceKmToCampus === null ? null : Number(p.distanceKmToCampus),
            transportDifficulty: p.transportDifficulty,
            housingInstability: p.housingInstability,
            foodInsecurity: p.foodInsecurity,
            currentGradeAverage: p.currentGradeAverage === null ? null : Number(p.currentGradeAverage),
            attendancePct: p.attendancePct === null ? null : Number(p.attendancePct),
            priorityFlags: flags.map((f) =>
              (typeof f === 'string' ? f : f.flag) as ScorableProfile['priorityFlags'][number],
            ),
          }
        : null,
    };
  }
}
