import { request } from './client';
import type {
  AllocateResult,
  AuthUser,
  AuditTrailItem,
  Batch,
  BatchDetail,
  BatchSettleResult,
  Charge,
  ChargeStatus,
  CloseResult,
  DashboardPayload,
  EconomyPreview,
  EconomyReport,
  EvaluateResult,
  Fund,
  FundDetail,
  FundListItem,
  FundStats,
  GenerateMonthlyResult,
  Institution,
  InstitutionDetail,
  InstitutionStatus,
  LedgerBalance,
  LedgerEntry,
  LedgerEntryType,
  LoginResponse,
  OnChainAnchor,
  PaymentLink,
  Proposal,
  ProposalCreated,
  ProposalDetail,
  ProposalStatus,
  ProposalType,
  RankingItem,
  Role,
  ScoringRule,
  ScorePreview,
  SolanaStatus,
  SocialImpact,
  StudentDetail,
  StudentListItem,
  StudentStatus,
  Tally,
  UserAccount,
  Vote,
  VoteChoice,
} from './types';

const qs = (params: Record<string, string | number | undefined | null>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  me: () => request<AuthUser>('/auth/me'),
};

export const institutionsApi = {
  list: () => request<Institution[]>('/institutions'),
  create: (body: {
    name: string;
    slug?: string;
    status?: InstitutionStatus;
    fundSharePct?: number;
    treasuryPub?: string;
  }) =>
    request<{ id: string; name: string; slug: string; status: InstitutionStatus }>('/institutions', {
      method: 'POST',
      body,
    }),
  dashboard: (id: string) => request<DashboardPayload>(`/institutions/dashboard/${id}`),
  detail: (id: string) => request<InstitutionDetail>(`/institutions/${id}`),
};

export const usersApi = {
  list: (institutionId?: string) =>
    request<UserAccount[]>(`/users${institutionId ? qs({ institutionId }) : ''}`),
  invite: (body: {
    name: string;
    email: string;
    role: Role;
    institutionId?: string;
    password?: string;
  }) => request<UserAccount>('/users', { method: 'POST', body }),
};

export const studentsApi = {
  list: (params: {
    institutionId: string;
    status?: StudentStatus;
    take?: number;
    skip?: number;
  }) => request<StudentListItem[]>(`/students${qs(params)}`),
  me: () => request<StudentDetail>('/students/me'),
  create: (body: {
    institutionId: string;
    fullName: string;
    email?: string;
    course: string;
    monthlyFee: number;
    enrollmentCode?: string;
    status?: StudentStatus;
    intakeYear?: number;
  }) =>
    request<{ id: string; enrollmentCode: string; fullName: string; course: string }>('/students', {
      method: 'POST',
      body,
    }),
  detail: (id: string) => request<StudentDetail>(`/students/${id}`),
  byEnrollment: (institutionId: string, code: string) =>
    request<StudentDetail>(`/students/enrollment/${institutionId}/${encodeURIComponent(code)}`),
};

export const chargesApi = {
  list: (params: {
    institutionId: string;
    status?: ChargeStatus;
    studentId?: string;
    take?: number;
    skip?: number;
  }) => request<Charge[]>(`/charges${qs(params)}`),
  mine: () => request<Charge[]>('/charges/me'),
  generate: (institutionId: string, period: string) =>
    request<GenerateMonthlyResult>('/charges/generate', {
      method: 'POST',
      body: { institutionId, period },
    }),
  markOverdue: (institutionId: string) =>
    request<{ updated: number }>('/charges/mark-overdue', {
      method: 'POST',
      body: { institutionId },
    }),
  paymentLink: (id: string) => request<PaymentLink>(`/charges/${id}/link`),
  confirm: (body: {
    chargeId: string;
    txSignature: string;
    payerPub?: string;
    idempotencyKey: string;
  }) =>
    request<{ duplicated: boolean; paymentId: string; chargeStatus: ChargeStatus; txSignature: string }>(
      '/charges/confirm',
      { method: 'POST', body },
    ),
};

export const batchesApi = {
  list: (institutionId: string) => request<Batch[]>(`/batches${qs({ institutionId })}`),
  detail: (id: string) => request<BatchDetail>(`/batches/${id}`),
  settle: (institutionId: string, period: string) =>
    request<BatchSettleResult>('/batches/settle', {
      method: 'POST',
      body: { institutionId, period },
    }),
};

export const fundApi = {
  stats: (institutionId: string) => request<FundStats>(`/fund/stats/${institutionId}`),
  list: (institutionId: string) => request<FundListItem[]>(`/fund/${institutionId}`),
  detail: (id: string) => request<FundDetail>(`/fund/detail/${id}`),
  previewEconomy: (body: {
    institutionId: string;
    period: string;
    bankFeePerLiquidation?: number;
    newVariableCostPerPayment?: number;
    platformFeePerStudent?: number;
    platformFeePerLiquidation?: number;
  }) => request<EconomyPreview>('/fund/economy/preview', { method: 'POST', body }),
  saveEconomy: (body: {
    institutionId: string;
    period: string;
    bankFeePerLiquidation?: number;
    newVariableCostPerPayment?: number;
    platformFeePerStudent?: number;
    platformFeePerLiquidation?: number;
  }) => request<EconomyReport>('/fund/economy', { method: 'POST', body }),
  create: (institutionId: string, period: string) =>
    request<Fund>('/fund/create', { method: 'POST', body: { institutionId, period } }),
  contribute: (id: string, amount: number, txSignature?: string) =>
    request<Fund>(`/fund/${id}/contribute`, {
      method: 'POST',
      body: { amount, txSignature },
    }),
};

export const scholarshipsApi = {
  rule: (institutionId: string) => request<ScoringRule>(`/scholarships/rule/${institutionId}`),
  publishRule: (institutionId: string, payload: { weights?: Record<string, number>; tierCutoffs?: Record<string, number> }) =>
    request<unknown>(`/scholarships/rule/${institutionId}/publish`, { method: 'POST', body: payload }),
  preview: (studentId: string) => request<ScorePreview>(`/scholarships/preview/${studentId}`),
  evaluate: (institutionId: string, period: string) =>
    request<EvaluateResult>('/scholarships/evaluate', {
      method: 'POST',
      body: { institutionId, period },
    }),
  ranking: (institutionId: string, period: string) =>
    request<RankingItem[]>(`/scholarships/ranking${qs({ institutionId, period })}`),
  allocate: (institutionId: string, period: string, fundId: string) =>
    request<AllocateResult>('/scholarships/allocate', {
      method: 'POST',
      body: { institutionId, period, fundId },
    }),
};

export const governanceApi = {
  proposals: (institutionId: string, status?: ProposalStatus) =>
    request<Proposal[]>(`/governance/proposals${qs({ institutionId, status })}`),
  createProposal: (body: {
    institutionId: string;
    type: ProposalType;
    title: string;
    description: string;
    voteDeadline: string;
  }) => request<ProposalCreated>('/governance/proposals', { method: 'POST', body }),
  proposal: (id: string) => request<ProposalDetail | null>(`/governance/proposals/${id}`),
  vote: (id: string, choice: VoteChoice, weight?: number) =>
    request<Vote>(`/governance/proposals/${id}/vote`, {
      method: 'POST',
      body: { choice, weight },
    }),
  tally: (id: string) => request<Tally>(`/governance/proposals/${id}/tally`),
  close: (id: string) => request<CloseResult>(`/governance/proposals/${id}/close`, { method: 'POST' }),
  auditTrail: (institutionId: string) =>
    request<AuditTrailItem[]>(`/governance/audit/${institutionId}`),
  anchors: (status?: OnChainAnchor['status']) =>
    request<OnChainAnchor[]>(`/governance/anchors${qs({ status })}`),
};

export const ledgerApi = {
  entries: (params: {
    institutionId: string;
    type?: LedgerEntryType;
    take?: number;
    skip?: number;
  }) => request<LedgerEntry[]>(`/ledger/entries${qs(params)}`),
  balances: (institutionId: string) => request<LedgerBalance[]>(`/ledger/balances/${institutionId}`),
  impact: (institutionId: string) => request<SocialImpact>(`/ledger/impact/${institutionId}`),
};

export const solanaApi = {
  status: () => request<SolanaStatus>('/solana/status', { auth: false }),
  confirm: (signature: string) =>
    request<{
      signature: string;
      confirmed: boolean;
      slot: number | null;
      err: unknown;
      confirmationStatus: string | null;
    }>('/solana/confirm', { method: 'POST', body: { signature } }),
  hash: (payload: Record<string, unknown>) =>
    request<{ payloadHash: string }>('/solana/hash', { method: 'POST', body: payload }),
};