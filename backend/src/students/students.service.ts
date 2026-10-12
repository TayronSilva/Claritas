import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateStudentDto {
  institutionId: string;
  fullName: string;
  email?: string;
  course: string;
  monthlyFee: number;
  enrollmentCode?: string;
  status?: string;
  intakeYear?: number;
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    const enrollmentCode =
      dto.enrollmentCode?.trim() || (await this.nextEnrollmentCode(dto.institutionId));

    const student = await this.prisma.student.create({
      data: {
        institutionId: dto.institutionId,
        enrollmentCode,
        fullName: dto.fullName,
        email: dto.email ?? null,
        course: dto.course,
        monthlyFee: new Prisma.Decimal(dto.monthlyFee),
        status: (dto.status as never) ?? 'ACTIVE',
        intakeYear: dto.intakeYear ?? new Date().getFullYear(),
      },
      select: {
        id: true,
        enrollmentCode: true,
        fullName: true,
        course: true,
        status: true,
      },
    });

    return student;
  }

  private async nextEnrollmentCode(institutionId: string) {
    const count = await this.prisma.student.count({ where: { institutionId } });
    return String(2_000_000 + count + 1);
  }

  async findAll(institutionId: string, status?: string, take = 50, skip = 0) {
    const students = await this.prisma.student.findMany({
      where: {
        institutionId,
        ...(status ? { status: status as never } : {}),
      },
      select: {
        id: true,
        enrollmentCode: true,
        fullName: true,
        course: true,
        monthlyFee: true,
        status: true,
        walletPub: true,
      },
      orderBy: { fullName: 'asc' },
      take: Math.min(take, 500),
      skip,
    });

    return students.map((s) => ({ ...s, monthlyFee: s.monthlyFee.toString() }));
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        socialProfile: true,
        charges: { orderBy: { dueDate: 'desc' }, take: 12 },
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { ruleVersion: { select: { version: true, label: true } } },
        },
        awards: { where: { status: 'ACTIVE' } },
      },
    });

    if (!student) throw new NotFoundException('Aluno nao encontrado');

    return {
      ...student,
      monthlyFee: student.monthlyFee.toString(),
      socialProfile: student.socialProfile
        ? {
            ...student.socialProfile,
            incomePerCapita: student.socialProfile.incomePerCapita.toString(),
          }
        : null,
      charges: student.charges.map((c) => ({ ...c, amount: c.amount.toString() })),
    };
  }

  async findMe(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Aluno nao vinculado a este usuario');
    return this.findOne(student.id);
  }

  async findByEnrollment(institutionId: string, enrollmentCode: string) {
    const student = await this.prisma.student.findFirst({
      where: { institutionId, enrollmentCode },
      include: { socialProfile: true },
    });
    if (!student) throw new NotFoundException('Aluno nao encontrado');
    return student;
  }
}
