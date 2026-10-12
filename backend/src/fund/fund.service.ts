import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EconomyInput {
  institutionId: string;
  period: string;
  bankFeePerLiquidation?: number;
  newVariableCostPerPayment?: number;
  platformFeePerStudent?: number;
  platformFeePerLiquidation?: number;
}

@Injectable()
export class FundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Economia liquida comprovada:
   *   custo bancario evitado - custos novos da solucao
   * Repasse ao fundo = percentual acordado x economia liquida.
   */
  async computeEconomy(input: EconomyInput) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: input.institutionId },
    });
    if (!institution) throw new NotFoundException('Instituicao nao encontrada');

    const bankFee = input.bankFeePerLiquidation
      ?? Number(this.config.get('BANK_FEE_PER_LIQUIDATION', '7.00'));

    const activeStudents = await this.prisma.student.count({
      where: { institutionId: input.institutionId, status: 'ACTIVE' },
    });

    const expectedLiquidation = Math.round(activeStudents * 0.95);

    const variableCost = input.newVariableCostPerPayment ?? 0.3;
    const platformStudentFee = input.platformFeePerStudent ?? 0.8;
    const platformLiquidationFee = input.platformFeePerLiquidation ?? 1.2;

    const bankCostCurrent = new Prisma.Decimal(bankFee).mul(expectedLiquidation);

    const newVariableCost = new Prisma.Decimal(variableCost).mul(expectedLiquidation);
    const platformFee = new Prisma.Decimal(platformStudentFee)
      .mul(activeStudents)
      .plus(new Prisma.Decimal(platformLiquidationFee).mul(expectedLiquidation));

    const grossEconomy = bankCostCurrent;
    const netEconomy = grossEconomy.minus(newVariableCost).minus(platformFee);

    const fundSharePct = institution.fundSharePct;
    const fundAmount = netEconomy
      .mul(fundSharePct)
      .div(100)
      .toDecimalPlaces(2);

    const institutionBenefit = netEconomy.minus(fundAmount);

    return {
      institutionId: input.institutionId,
      period: input.period,
      activeStudents,
      expectedLiquidation,
      bankFeePerLiquidation: new Prisma.Decimal(bankFee),
      bankCostCurrent,
      newVariableCost,
      platformFee,
      grossEconomy,
      netEconomy,
      fundSharePct,
      fundAmount,
      institutionBenefit,
      isVerified: false,
      disclaimer:
        'Premissa de planejamento. Substituir pelo convênio bancário real da instituição antes de apresentar como fato.',
    };
  }

  async createReport(input: EconomyInput) {
    const computed = await this.computeEconomy(input);

    const report = await this.prisma.economyReport.upsert({
      where: {
        institutionId_period: {
          institutionId: input.institutionId,
          period: input.period,
        },
      },
      create: {
        institutionId: input.institutionId,
        period: input.period,
        activeStudents: computed.activeStudents,
        expectedLiquidation: computed.expectedLiquidation,
        bankFeePerLiquidation: computed.bankFeePerLiquidation,
        bankCostCurrent: computed.bankCostCurrent,
        newVariableCost: computed.newVariableCost,
        platformFee: computed.platformFee,
        grossEconomy: computed.grossEconomy,
        netEconomy: computed.netEconomy,
        fundSharePct: computed.fundSharePct,
        fundAmount: computed.fundAmount,
        institutionBenefit: computed.institutionBenefit,
        isVerified: false,
      },
      update: {
        activeStudents: computed.activeStudents,
        expectedLiquidation: computed.expectedLiquidation,
        bankFeePerLiquidation: computed.bankFeePerLiquidation,
        bankCostCurrent: computed.bankCostCurrent,
        newVariableCost: computed.newVariableCost,
        platformFee: computed.platformFee,
        grossEconomy: computed.grossEconomy,
        netEconomy: computed.netEconomy,
        fundSharePct: computed.fundSharePct,
        fundAmount: computed.fundAmount,
        institutionBenefit: computed.institutionBenefit,
      },
    });

    return report;
  }

  /** Cria o fundo do periodo a partir do relatorio economico. */
  async createFund(institutionId: string, period: string) {
    const report = await this.prisma.economyReport.findUnique({
      where: { institutionId_period: { institutionId, period } },
    });

    if (!report) {
      throw new BadRequestException(
        'Gere o relatório econômico do período antes de criar o fundo',
      );
    }

    return this.prisma.fund.upsert({
      where: { economyReportId: report.id },
      create: {
        institutionId,
        economyReportId: report.id,
        period,
        budget: report.fundAmount,
        contributed: 0,
        distributed: 0,
        reserved: 0,
      },
      update: { budget: report.fundAmount },
    });
  }

  findAll(institutionId: string) {
    return this.prisma.fund.findMany({
      where: { institutionId },
      include: {
        economyReport: true,
        _count: { select: { awards: true } },
      },
      orderBy: { period: 'desc' },
    });
  }

  async findOne(id: string) {
    const fund = await this.prisma.fund.findUnique({
      where: { id },
      include: {
        economyReport: true,
        awards: {
          include: {
            student: {
              select: { fullName: true, enrollmentCode: true, course: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!fund) throw new NotFoundException('Fundo não encontrado');
    return fund;
  }

  /** Repasse ao fundo. Lancamento de dupla entrada, com prova ancoravel. */
  async contribute(fundId: string, amount: number, txSignature?: string) {
    const fund = await this.prisma.fund.findUnique({ where: { id: fundId } });
    if (!fund) throw new NotFoundException('Fundo não encontrado');

    if (amount > fund.budget.minus(fund.contributed).minus(fund.distributed).minus(fund.reserved).toNumber()) {
      throw new BadRequestException('Repasse excede o orçamento disponível');
    }

    const value = new Prisma.Decimal(amount);

    const updated = await this.prisma.fund.update({
      where: { id: fundId },
      data: { contributed: fund.contributed.plus(value) },
    });

    await this.prisma.ledgerEntry.create({
      data: {
        institutionId: fund.institutionId,
        type: 'FUND_CONTRIBUTION',
        direction: 'CREDIT',
        amount: value,
        account: `fundo:${fund.period}`,
        memo: 'Repasse da economia líquida ao fundo de permanência',
        onchainRef: txSignature,
      },
    });

    return updated;
  }

  async stats(institutionId: string) {
    const funds = await this.prisma.fund.findMany({ where: { institutionId } });

    const totals = funds.reduce(
      (acc, f) => ({
        budget: acc.budget.plus(f.budget),
        contributed: acc.contributed.plus(f.contributed),
        distributed: acc.distributed.plus(f.distributed),
        reserved: acc.reserved.plus(f.reserved),
      }),
      {
        budget: new Prisma.Decimal(0),
        contributed: new Prisma.Decimal(0),
        distributed: new Prisma.Decimal(0),
        reserved: new Prisma.Decimal(0),
      },
    );

    const awards = await this.prisma.scholarshipAward.count({
      where: { fund: { institutionId }, status: 'ACTIVE' },
    });

    const byTier = await this.prisma.scholarshipAward.groupBy({
      by: ['tier'],
      where: { fund: { institutionId } },
      _count: { _all: true },
      _sum: { monthlyValue: true },
    });

    return {
      totals: {
        budget: totals.budget.toString(),
        contributed: totals.contributed.toString(),
        distributed: totals.distributed.toString(),
        reserved: totals.reserved.toString(),
        available: totals.budget
          .minus(totals.distributed)
          .minus(totals.reserved)
          .toString(),
      },
      activeAwards: awards,
      byTier: byTier.map((t) => ({
        tier: t.tier,
        count: t._count._all,
        monthlyTotal: t._sum.monthlyValue?.toString() ?? '0',
      })),
    };
  }
}
