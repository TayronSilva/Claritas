import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateInstitutionDto {
  name: string;
  slug?: string;
  status?: string;
  fundSharePct?: number;
  treasuryPub?: string;
}

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstitutionDto) {
    const slug = (dto.slug?.trim() || dto.name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const uniqueSlug = await this.ensureUniqueSlug(slug);

    return this.prisma.institution.create({
      data: {
        name: dto.name,
        slug: uniqueSlug,
        status: (dto.status as never) ?? 'PILOT',
        fundSharePct: new Prisma.Decimal(dto.fundSharePct ?? 30),
        treasuryPub: dto.treasuryPub ?? null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        fundSharePct: true,
      },
    });
  }

  private async ensureUniqueSlug(base: string) {
    let slug = base || 'unidade';
    let suffix = 1;
    while (await this.prisma.institution.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  findAll() {
    return this.prisma.institution.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        status: true,
        fundSharePct: true,
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true, charges: true } },
        scoringRuleVers: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!institution) throw new NotFoundException('Instituicao nao encontrada');
    return institution;
  }

  async dashboard(id: string) {
    const [institution, students, charges, funds, awards, latestReport] =
      await Promise.all([
        this.prisma.institution.findUnique({
          where: { id },
          select: { id: true, name: true, fundSharePct: true, status: true },
        }),
        this.prisma.student.count({ where: { institutionId: id, status: 'ACTIVE' } }),
        this.prisma.charge.groupBy({
          by: ['status'],
          where: { institutionId: id },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        this.prisma.fund.findMany({
          where: { institutionId: id },
          orderBy: { period: 'desc' },
          take: 6,
        }),
        this.prisma.scholarshipAward.count({
          where: { fund: { institutionId: id }, status: 'ACTIVE' },
        }),
        this.prisma.economyReport.findFirst({
          where: { institutionId: id },
          orderBy: { period: 'desc' },
        }),
      ]);

    if (!institution) throw new NotFoundException('Instituicao nao encontrada');

    return {
      institution,
      students,
      chargesByStatus: charges.map((c) => ({
        status: c.status,
        count: c._count._all,
        amount: c._sum.amount?.toString() ?? '0',
      })),
      funds: funds.map((f) => ({
        period: f.period,
        budget: f.budget.toString(),
        contributed: f.contributed.toString(),
        distributed: f.distributed.toString(),
        available: f.budget
          .minus(f.distributed)
          .minus(f.reserved)
          .toString(),
      })),
      activeAwards: awards,
      latestEconomy: latestReport
        ? {
            period: latestReport.period,
            bankCostCurrent: latestReport.bankCostCurrent.toString(),
            netEconomy: latestReport.netEconomy.toString(),
            fundAmount: latestReport.fundAmount.toString(),
            fundSharePct: latestReport.fundSharePct.toString(),
            isVerified: latestReport.isVerified,
          }
        : null,
    };
  }
}
