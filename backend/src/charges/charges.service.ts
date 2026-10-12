import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChargeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SolanaService } from '../solana/solana.service';

export interface CreateChargeDto {
  institutionId: string;
  studentId: string;
  amount: number;
  dueDate: string;
  description?: string;
}

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly solana: SolanaService,
  ) {}

  async findAll(
    institutionId: string,
    status?: ChargeStatus,
    studentId?: string,
    take = 100,
    skip = 0,
  ) {
    const charges = await this.prisma.charge.findMany({
      where: {
        institutionId,
        ...(status ? { status } : {}),
        ...(studentId ? { studentId } : {}),
      },
      include: {
        student: { select: { fullName: true, enrollmentCode: true, walletPub: true } },
        payment: { select: { status: true, txSignature: true, feeSponsored: true, confirmedAt: true } },
      },
      orderBy: { dueDate: 'desc' },
      take: Math.min(take, 500),
      skip,
    });

    return charges.map((c) => ({
      id: c.id,
      reference: c.reference,
      description: c.description,
      amount: c.amount.toString(),
      dueDate: c.dueDate,
      status: c.status,
      paidAt: c.paidAt,
      student: c.student,
      batchId: c.batchId,
      payment: c.payment,
    }));
  }

  async findMine(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      select: { id: true, institutionId: true },
    });
    if (!student) return [];
    return this.findAll(student.institutionId, undefined, student.id, 200, 0);
  }

  async create(dto: CreateChargeDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId: dto.institutionId },
    });

    if (!student) throw new BadRequestException('Aluno nao pertence a instituicao');

    const reference = await this.generateReference(dto.institutionId, dto.studentId);

    const charge = await this.prisma.charge.create({
      data: {
        institutionId: dto.institutionId,
        studentId: dto.studentId,
        reference,
        description: dto.description ?? `Mensalidade ${dto.dueDate.slice(0, 7)}`,
        amount: new Prisma.Decimal(dto.amount),
        dueDate: new Date(dto.dueDate),
        status: 'PENDING',
      },
    });

    return {
      id: charge.id,
      reference: charge.reference,
      amount: charge.amount.toString(),
      dueDate: charge.dueDate,
      status: charge.status,
      student: { id: student.id, fullName: student.fullName },
    };
  }

  /** Gera mensalidades para toda a carteira ativa de um periodo. */
  async generateMonthly(institutionId: string, period: string) {
    const students = await this.prisma.student.findMany({
      where: { institutionId, status: 'ACTIVE' },
      select: { id: true, fullName: true, monthlyFee: true, intakeYear: true },
    });

    const [year, month] = period.split('-').map(Number);
    const dueDate = new Date(Date.UTC(year, month - 1, 10));

    let created = 0;
    let skipped = 0;

    for (const student of students) {
      const reference = `${period}-${student.id.slice(-8)}`;

      const existing = await this.prisma.charge.findUnique({ where: { reference } });
      if (existing) {
        skipped++;
        continue;
      }

      await this.prisma.charge.create({
        data: {
          institutionId,
          studentId: student.id,
          reference,
          description: `Mensalidade ${period}`,
          amount: student.monthlyFee,
          dueDate,
          status: 'PENDING',
        },
      });
      created++;
    }

    return { period, dueDate, created, skipped, total: students.length };
  }

  /**
   * Link de pagamento. No MVP e um QR simulado; o contrato ja reserva o formato
   * definitivo para quando o PSP for plugado.
   */
  async paymentLink(chargeId: string) {
    const charge = await this.prisma.charge.findUnique({
      where: { id: chargeId },
      include: {
        student: { select: { fullName: true, enrollmentCode: true, walletPub: true } },
        institution: { select: { name: true, treasuryPub: true } },
      },
    });

    if (!charge) throw new BadRequestException('Cobranca nao encontrada');
    if (charge.status === 'PAID') throw new BadRequestException('Cobranca ja paga');

    const status = await this.solana.getStatus();

    return {
      chargeId: charge.id,
      reference: charge.reference,
      amount: charge.amount.toString(),
      dueDate: charge.dueDate,
      student: charge.student,
      payTo: charge.institution.treasuryPub,
      network: status.network,
      // No MVP o aluno ve apenas "paguei a mensalidade".
      // A taxa e patrocinada pela plataforma e nunca aparece para o aluno.
      feeSponsored: status.ready,
      qrPayload: `claritas://pay/${charge.reference}`,
    };
  }

  /** Confirma pagamento idempotente: a mesma chave nunca gera dois creditos. */
  async confirmPayment(input: {
    chargeId: string;
    txSignature: string;
    payerPub?: string;
    idempotencyKey: string;
  }) {
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { charge: true },
    });

    if (existing) {
      return {
        duplicated: true,
        paymentId: existing.id,
        chargeStatus: existing.charge.status,
        txSignature: existing.txSignature,
      };
    }

    const charge = await this.prisma.charge.findUnique({
      where: { id: input.chargeId },
    });
    if (!charge) throw new BadRequestException('Cobranca nao encontrada');

    const confirmed = charge.status === 'PENDING';

    const payment = await this.prisma.payment.create({
      data: {
        chargeId: charge.id,
        idempotencyKey: input.idempotencyKey,
        payerPub: input.payerPub ?? 'aluno',
        feePayerPub: this.solana.feePayerPubkey?.toBase58() ?? 'plataforma',
        feeSponsored: this.solana.isFeePayerReady,
        txSignature: input.txSignature,
        status: 'CONFIRMED',
        amount: charge.amount,
        confirmedAt: confirmed ? new Date() : null,
      },
    });

    if (confirmed) {
      await this.prisma.charge.update({
        where: { id: charge.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          onchainRef: SolanaService.hashPayload({
            chargeId: charge.id,
            reference: charge.reference,
            amount: charge.amount.toString(),
            tx: input.txSignature,
          }),
        },
      });

      await this.prisma.ledgerEntry.create({
        data: {
          institutionId: charge.institutionId,
          type: 'REVENUE',
          direction: 'CREDIT',
          amount: charge.amount,
          account: 'recebimento:mensalidade',
          memo: `Cobranca ${charge.reference}`,
          onchainRef: input.txSignature,
        },
      });
    }

    return {
      duplicated: false,
      paymentId: payment.id,
      chargeStatus: confirmed ? 'PAID' : charge.status,
      txSignature: payment.txSignature,
    };
  }

  async markOverdue(institutionId: string) {
    const result = await this.prisma.charge.updateMany({
      where: {
        institutionId,
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });

    return { updated: result.count };
  }

  private async generateReference(institutionId: string, studentId: string): Promise<string> {
    const now = new Date();
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return `${period}-${studentId.slice(-8)}-${institutionId.slice(-4)}`;
  }
}
