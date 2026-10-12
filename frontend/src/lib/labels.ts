import {
  AWARD_STATUSES,
  AWARD_TIERS,
  BATCH_STATUSES,
  CHARGE_STATUSES,
  LEDGER_ENTRY_TYPES,
  ON_CHAIN_STATUSES,
  PROPOSAL_STATUSES,
  ROLE_LABELS,
  ROLES,
  STUDENT_STATUSES,
  VOTE_CHOICES,
  type ApplicationStatus,
  type AwardStatus,
  type AwardTier,
  type BatchStatus,
  type ChargeStatus,
  type InstitutionStatus,
  type LedgerDirection,
  type LedgerEntryType,
  type OnChainStatus,
  type ProposalStatus,
  type ProposalType,
  type Role,
  type StudentStatus,
  type VoteChoice,
} from '../api/types';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'accent';

const CHARGE_STATUS_META: Record<ChargeStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  PAID: { label: 'Pago', tone: 'success' },
  OVERDUE: { label: 'Vencido', tone: 'error' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
};

const STUDENT_STATUS_META: Record<StudentStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  TRUNCATED: { label: 'Trancado', tone: 'warning' },
  GRADUATED: { label: 'Formado', tone: 'info' },
  DROPPED: { label: 'Desligado', tone: 'neutral' },
};

const BATCH_STATUS_META: Record<BatchStatus, { label: string; tone: BadgeTone }> = {
  BUILDING: { label: 'Montando', tone: 'neutral' },
  SUBMITTED: { label: 'Enviado', tone: 'info' },
  CONFIRMED: { label: 'Confirmado', tone: 'success' },
  FAILED: { label: 'Falhou', tone: 'error' },
};

const PROPOSAL_STATUS_META: Record<ProposalStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  OPEN: { label: 'Em votação', tone: 'info' },
  APPROVED: { label: 'Aprovada', tone: 'success' },
  REJECTED: { label: 'Rejeitada', tone: 'error' },
  EXECUTED: { label: 'Executada', tone: 'neutral' },
};

const PROPOSAL_TYPE_META: Record<ProposalType, { label: string; short: string }> = {
  PRIORITY: { label: 'Prioridades do fundo', short: 'Prioridade' },
  FUND_PERCENTAGE: { label: 'Percentual do fundo', short: 'Percentual' },
  RULE_CHANGE: { label: 'Mudança de regra', short: 'Regra' },
};

const TIER_META: Record<AwardTier, { label: string; tone: BadgeTone }> = {
  A: { label: 'Faixa A', tone: 'accent' },
  B: { label: 'Faixa B', tone: 'info' },
  C: { label: 'Faixa C', tone: 'success' },
  D: { label: 'Faixa D', tone: 'neutral' },
};

const AWARD_STATUS_META: Record<AwardStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  SUSPENDED: { label: 'Suspensa', tone: 'warning' },
  EXPIRED: { label: 'Expirada', tone: 'neutral' },
  CANCELLED: { label: 'Cancelada', tone: 'error' },
};

const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; tone: BadgeTone }> = {
  ELIGIBLE: { label: 'Elegível', tone: 'info' },
  INELIGIBLE: { label: 'Não elegível', tone: 'neutral' },
  AWARDED: { label: 'Concedida', tone: 'success' },
  NOT_AWARDED: { label: 'Não concedida', tone: 'warning' },
  APPEALED: { label: 'Em recurso', tone: 'accent' },
};

const INSTITUTION_STATUS_META: Record<InstitutionStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  PILOT: { label: 'Piloto', tone: 'info' },
  SUSPENDED: { label: 'Suspensa', tone: 'error' },
};

const LEDGER_TYPE_META: Record<LedgerEntryType, { label: string; tone: BadgeTone }> = {
  REVENUE: { label: 'Receita', tone: 'success' },
  BANK_FEE: { label: 'Tarifa bancária', tone: 'error' },
  PLATFORM_FEE: { label: 'Taxa da plataforma', tone: 'info' },
  PSP_COST: { label: 'Custo de pagamento', tone: 'warning' },
  FUND_CONTRIBUTION: { label: 'Repasse ao fundo', tone: 'accent' },
  SCHOLARSHIP_PAID: { label: 'Bolsa paga', tone: 'accent' },
  REFUND: { label: 'Estorno', tone: 'warning' },
  ADJUSTMENT: { label: 'Ajuste', tone: 'neutral' },
};

const DIRECTION_META: Record<LedgerDirection, { label: string; tone: BadgeTone }> = {
  CREDIT: { label: 'Entrada', tone: 'success' },
  DEBIT: { label: 'Saída', tone: 'error' },
};

const ON_CHAIN_META: Record<OnChainStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  ANCHORED: { label: 'Ancorado', tone: 'success' },
  FAILED: { label: 'Falhou', tone: 'error' },
};

const VOTE_CHOICE_META: Record<VoteChoice, { label: string; tone: BadgeTone }> = {
  APPROVE: { label: 'A favor', tone: 'success' },
  REJECT: { label: 'Contra', tone: 'error' },
  ABSTAIN: { label: 'Abstenção', tone: 'neutral' },
};

const ROLE_META: Record<Role, { label: string; tone: BadgeTone }> = {
  PLATFORM_ADMIN: { label: 'Administrador', tone: 'accent' },
  INSTITUTION_FINANCE: { label: 'Financeiro', tone: 'info' },
  COMMITTEE_MEMBER: { label: 'Comitê', tone: 'success' },
  STUDENT: { label: 'Aluno', tone: 'neutral' },
};

const meta = <T extends string>(
  map: Record<T, { label: string; tone: BadgeTone }>,
  value: T,
): { label: string; tone: BadgeTone } => map[value] ?? { label: value, tone: 'neutral' };

export const statusMeta = {
  charge: (s: ChargeStatus) => meta(CHARGE_STATUS_META, s),
  student: (s: StudentStatus) => meta(STUDENT_STATUS_META, s),
  batch: (s: BatchStatus) => meta(BATCH_STATUS_META, s),
  proposal: (s: ProposalStatus) => meta(PROPOSAL_STATUS_META, s),
  tier: (s: AwardTier) => meta(TIER_META, s),
  award: (s: AwardStatus) => meta(AWARD_STATUS_META, s),
  application: (s: ApplicationStatus) => meta(APPLICATION_STATUS_META, s),
  institution: (s: InstitutionStatus) => meta(INSTITUTION_STATUS_META, s),
  ledgerType: (s: LedgerEntryType) => meta(LEDGER_TYPE_META, s),
  direction: (s: LedgerDirection) => meta(DIRECTION_META, s),
  onChain: (s: OnChainStatus) => meta(ON_CHAIN_META, s),
  vote: (s: VoteChoice) => meta(VOTE_CHOICE_META, s),
  role: (s: Role) => meta(ROLE_META, s),
};

export const labels = {
  proposalType: (t: ProposalType) => PROPOSAL_TYPE_META[t]?.label ?? t,
  proposalTypeShort: (t: ProposalType) => PROPOSAL_TYPE_META[t]?.short ?? t,
  role: (r: Role) => ROLE_LABELS[r] ?? r,
};

export const options = {
  chargeStatus: CHARGE_STATUSES,
  studentStatus: STUDENT_STATUSES,
  batchStatus: BATCH_STATUSES,
  proposalStatus: PROPOSAL_STATUSES,
  awardTier: AWARD_TIERS,
  awardStatus: AWARD_STATUSES,
  ledgerEntryType: LEDGER_ENTRY_TYPES,
  onChainStatus: ON_CHAIN_STATUSES,
  voteChoice: VOTE_CHOICES,
  role: ROLES,
};