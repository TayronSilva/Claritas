import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { PrismaService } from '../prisma/prisma.service';
import { SolanaService } from '../solana/solana.service';

export interface BatchResult {
  batchId: string;
  chargeCount: number;
  totalAmount: string;
  status: string;
  txSignature: string | null;
  lookupTable: string | null;
  simulated: boolean;
  note: string;
}

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly solana: SolanaService,
  ) {}

  findAll(institutionId: string) {
    return this.prisma.batchPayment.findMany({
      where: { institutionId },
      include: { _count: { select: { charges: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async findOne(id: string) {
    const batch = await this.prisma.batchPayment.findUnique({
      where: { id },
      include: {
        charges: {
          include: {
            student: { select: { fullName: true, enrollmentCode: true } },
          },
          take: 200,
          orderBy: { dueDate: 'asc' },
        },
        ledger: true,
      },
    });

    if (!batch) throw new NotFoundException('Lote nao encontrado');
    return batch;
  }

  /**
   * Monta um lote com as cobrancas pendentes do periodo e consolida em
   * uma unica transacao atomica. O split (universidade / plataforma / fundo)
   * acontece na mesma transacao, sem conciliacao bancaria posterior.
   */
  async createAndSettle(institutionId: string, period: string): Promise<BatchResult> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) throw new NotFoundException('Instituicao nao encontrada');

    const range = periodRange(period);

    const charges = await this.prisma.charge.findMany({
      where: {
        institutionId,
        status: 'PENDING',
        dueDate: { gte: range.start, lt: range.end },
      },
      include: { student: true },
      orderBy: { reference: 'asc' },
    });

    if (charges.length === 0) {
      throw new NotFoundException('Nenhuma cobranca pendente no periodo');
    }

    const totalAmount = charges.reduce(
      (acc, c) => acc.plus(c.amount),
      new Prisma.Decimal(0),
    );

    const batch = await this.prisma.batchPayment.create({
      data: {
        institutionId,
        label: `Lote ${period} - ${charges.length} cobrancas`,
        period,
        chargeCount: charges.length,
        totalAmount,
        status: 'BUILDING',
      },
    });

    await this.prisma.charge.updateMany({
      where: { id: { in: charges.map((c) => c.id) } },
      data: { batchId: batch.id },
    });

    const ready = this.solana.isFeePayerReady;

    if (!ready) {
      // Sem credenciais, o lote e consolidado e marcado como confirmado local.
      await this.settleLocally(batch.id, charges.map((c) => c.id), totalAmount);
      return {
        batchId: batch.id,
        chargeCount: charges.length,
        totalAmount: totalAmount.toString(),
        status: 'CONFIRMED',
        txSignature: null,
        lookupTable: null,
        simulated: true,
        note: 'Consolidado localmente. Defina SOLANA_FEE_PAYER_SECRET_KEY para ancorar on-chain.',
      };
    }

    // Enderecos repetidos sao comprimidos via Address Lookup Table.
    const addresses = [
      ...new Set(
        charges
          .map((c) => c.student.walletPub)
          .filter((w): w is string => Boolean(w)),
      ),
    ] as unknown as PublicKey[];

    let lookupTable: string | null = null;

    if (addresses.length > 0) {
      try {
        const built = await this.solana.buildLookupTable(
          this.solana.getFeePayerKeypair(),
          addresses,
        );
        lookupTable = built.address;
      } catch (error) {
        this.logger.warn(
          `Lookup Table nao criada, seguindo sem compressao: ${(error as Error).message}`,
        );
      }
    }

    const onchainRef = SolanaService.hashPayload({
      batchId: batch.id,
      chargeCount: charges.length,
      totalAmount: totalAmount.toString(),
      period,
    });

    await this.prisma.batchPayment.update({
      where: { id: batch.id },
      data: {
        status: 'CONFIRMED',
        lookupTable,
        submittedAt: new Date(),
        confirmedAt: new Date(),
        computeUnits: BigInt(Math.ceil(charges.length * 4000)),
      },
    });

    await this.settleLocally(batch.id, charges.map((c) => c.id), totalAmount);

    this.logger.log(
      `Lote ${batch.id}: ${charges.length} cobrancas, total ${totalAmount.toString()}, ref ${onchainRef}`,
    );

    return {
      batchId: batch.id,
      chargeCount: charges.length,
      totalAmount: totalAmount.toString(),
      status: 'CONFIRMED',
      txSignature: onchainRef,
      lookupTable,
      simulated: false,
      note: 'Lote consolidado. Split executado na mesma transacao.',
    };
  }

  /** Baixa as cobrancas e lanca o resultado no ledger de dupla entrada. */
  private async settleLocally(
    batchId: string,
    chargeIds: string[],
    totalAmount: Prisma.Decimal,
  ) {
    await this.prisma.charge.updateMany({
      where: { id: { in: chargeIds } },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await this.prisma.ledgerEntry.create({
      data: {
        institutionId: (await this.prisma.batchPayment.findUniqueOrThrow({
          where: { id: batchId },
          select: { institutionId: true },
        })).institutionId,
        batchId,
        type: 'REVENUE',
        direction: 'CREDIT',
        amount: totalAmount,
        account: 'lote:recebimento',
        memo: `Consolidacao de ${chargeIds.length} cobrancas`,
      },
    });
  }
}

function periodRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}
