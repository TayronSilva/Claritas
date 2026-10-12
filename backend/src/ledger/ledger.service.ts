import { Injectable } from '@nestjs/common';
import { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    institutionId: string,
    filters?: { type?: LedgerEntryType; account?: string; take?: number; skip?: number },
  ) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        institutionId,
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.account ? { account: filters.account } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters?.take ?? 200, 1000),
      skip: filters?.skip ?? 0,
    });
  }

  /** Saldos por conta. Debito e credito se anulam por conta. */
  async balances(institutionId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { institutionId },
      select: { account: true, direction: true, amount: true },
    });

    const byAccount = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();

    for (const e of entries) {
      const acc = byAccount.get(e.account) ?? {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      };
      if (e.direction === LedgerDirection.DEBIT) acc.debit = acc.debit.plus(e.amount);
      else acc.credit = acc.credit.plus(e.amount);
      byAccount.set(e.account, acc);
    }

    return Array.from(byAccount.entries()).map(([account, v]) => ({
      account,
      debit: v.debit.toString(),
      credit: v.credit.toString(),
      balance: v.credit.minus(v.debit).toString(),
    }));
  }

  /** Relatorio de impacto social: quanto foi para o fundo, para quantas pessoas. */
  async socialImpact(institutionId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        institutionId,
        type: LedgerEntryType.SCHOLARSHIP_PAID,
      },
      select: { amount: true, createdAt: true, awardId: true },
    });

    const awards = await this.prisma.scholarshipAward.findMany({
      where: { fund: { institutionId } },
      select: {
        id: true,
        tier: true,
        monthlyValue: true,
        status: true,
        startsAt: true,
        student: {
          select: { id: true, course: true, enrollmentCode: true },
        },
      },
    });

    const totalDistributed = entries.reduce(
      (acc, e) => acc.plus(e.amount),
      new Prisma.Decimal(0),
    );

    const byTier = new Map<string, { count: number; total: Prisma.Decimal }>();

    for (const a of awards) {
      const entry = byTier.get(a.tier) ?? { count: 0, total: new Prisma.Decimal(0) };
      entry.count++;
      entry.total = entry.total.plus(a.monthlyValue);
      byTier.set(a.tier, entry);
    }

    return {
      institutionId,
      totalDistributed: totalDistributed.toString(),
      studentsBenefited: new Set(awards.map((a) => a.student.id)).size,
      activeAwards: awards.filter((a) => a.status === 'ACTIVE').length,
      byTier: Array.from(byTier.entries()).map(([tier, v]) => ({
        tier,
        count: v.count,
        total: v.total.toString(),
      })),
      byCourse: this.groupByCourse(awards),
    };
  }

  private groupByCourse(
    awards: Array<{ monthlyValue: Prisma.Decimal; student: { course: string } }>,
  ) {
    const byCourse = new Map<string, { count: number; total: Prisma.Decimal }>();

    for (const a of awards) {
      const entry = byCourse.get(a.student.course) ?? {
        count: 0,
        total: new Prisma.Decimal(0),
      };
      entry.count++;
      entry.total = entry.total.plus(a.monthlyValue);
      byCourse.set(a.student.course, entry);
    }

    return Array.from(byCourse.entries()).map(([course, v]) => ({
      course,
      count: v.count,
      total: v.total.toString(),
    }));
  }
}
