import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProposalStatus, ProposalType, VoteChoice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SolanaService } from '../solana/solana.service';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly solana: SolanaService,
  ) {}

  /**
   * Propostas votam apenas prioridades gerais e percentual do fundo.
   * Casos individuais de bolsa nao entram em votacao popular: expoem
   * situacao de vulnerabilidade e transformaria assistance em concurso.
   */
  createProposal(input: {
    institutionId: string;
    authorId: string;
    type: ProposalType;
    title: string;
    description: string;
    voteDeadline: Date;
  }) {
    if (input.type !== ProposalType.PRIORITY && input.type !== ProposalType.FUND_PERCENTAGE) {
      throw new BadRequestException(
        'Voto popular so aceita PRIORITY ou FUND_PERCENTAGE',
      );
    }

    if (input.voteDeadline <= new Date()) {
      throw new BadRequestException('Prazo de votação deve ser futuro');
    }

    return this.prisma.proposal.create({
      data: { ...input, status: ProposalStatus.OPEN },
    });
  }

  findAll(institutionId: string, status?: ProposalStatus) {
    return this.prisma.proposal.findMany({
      where: { institutionId, ...(status ? { status } : {}) },
      include: {
        author: { select: { name: true, role: true } },
        votes: {
          select: { voterKind: true, choice: true, weight: true },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.proposal.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, role: true } },
        votes: {
          include: { voter: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        onchain: true,
      },
    });
  }

  /**
   * Voto com identidade institucional: um voto por pessoa por proposta.
   * O hash do voto e o que vai para a cadeia, nao o conteudo.
   */
  async castVote(input: {
    proposalId: string;
    voterId: string;
    voterKind: 'STUDENT' | 'COMMITTEE' | 'AUDIT';
    choice: VoteChoice;
    weight?: number;
  }) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: input.proposalId },
    });

    if (!proposal) throw new NotFoundException('Proposta não encontrada');

    if (proposal.status !== ProposalStatus.OPEN) {
      throw new ForbiddenException('Votação encerrada');
    }

    if (proposal.voteDeadline < new Date()) {
      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.EXECUTED, closedAt: new Date() },
      });
      throw new ForbiddenException('Prazo de votação expirado');
    }

    const onchainHash = SolanaService.hashPayload({
      proposalId: proposal.id,
      voterId: input.voterId,
      choice: input.choice,
      at: new Date().toISOString(),
    });

    const vote = await this.prisma.vote.upsert({
      where: {
        proposalId_voterId: { proposalId: proposal.id, voterId: input.voterId },
      },
      create: {
        proposalId: proposal.id,
        voterId: input.voterId,
        voterKind: input.voterKind,
        choice: input.choice,
        weight: input.weight ?? 1,
        onchainHash,
      },
      update: { choice: input.choice, onchainHash, createdAt: new Date() },
    });

    return vote;
  }

  /** Tally simples. Sem token de governanca, sem peso escondecido. */
  async tally(proposalId: string) {
    const votes = await this.prisma.vote.findMany({
      where: { proposalId },
    });

    const tally = { approve: 0, reject: 0, abstain: 0, voters: votes.length };
    let approveWeight = 0;
    let rejectWeight = 0;

    for (const v of votes) {
      const w = v.weight;
      if (v.choice === 'APPROVE') {
        tally.approve++;
        approveWeight += w;
      } else if (v.choice === 'REJECT') {
        tally.reject++;
        rejectWeight += w;
      } else {
        tally.abstain++;
      }
    }

    const totalWeight = approveWeight + rejectWeight;
    const passed = totalWeight > 0 && approveWeight > rejectWeight;

    return {
      proposalId,
      ...tally,
      approveWeight,
      rejectWeight,
      totalWeight,
      passed,
    };
  }

  /** Fecha a votacao e ancora a prova na cadeia. */
  async close(proposalId: string) {
    const result = await this.tally(proposalId);

    const proposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: result.passed ? ProposalStatus.APPROVED : ProposalStatus.REJECTED,
        closedAt: new Date(),
      },
    });

    const payloadHash = SolanaService.hashPayload({
      proposalId,
      approveWeight: result.approveWeight,
      rejectWeight: result.rejectWeight,
      voters: result.voters,
    });

    const anchor = await this.prisma.onChainAnchor.upsert({
      where: { proposalId },
      create: {
        proposalId,
        entityType: 'PROPOSAL',
        entityId: proposalId,
        payloadHash,
        network: this.solana.network,
        status: 'ANCHORED',
        anchoredAt: new Date(),
      },
      update: { payloadHash, status: 'ANCHORED', anchoredAt: new Date() },
    });

    return { proposal, tally: result, anchor };
  }

  /** Audit trail: o que foi ancorado, quando e com qual hash. */
  async auditTrail(institutionId: string, take = 100) {
    const proposals = await this.prisma.proposal.findMany({
      where: { institutionId },
      select: { id: true, title: true, type: true, status: true, closedAt: true },
    });

    const anchors = await this.prisma.onChainAnchor.findMany({
      where: { entityType: 'PROPOSAL', entityId: { in: proposals.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return anchors.map((a) => ({
      ...a,
      proposal: proposals.find((p) => p.id === a.entityId) ?? null,
    }));
  }

  async anchors(status?: 'PENDING' | 'ANCHORED' | 'FAILED') {
    return this.prisma.onChainAnchor.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
