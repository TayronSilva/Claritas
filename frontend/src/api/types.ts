export const ROLES = [
  'PLATFORM_ADMIN',
  'INSTITUTION_FINANCE',
  'COMMITTEE_MEMBER',
  'STUDENT',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_ADMIN: 'Administrador',
  INSTITUTION_FINANCE: 'Financeiro',
  COMMITTEE_MEMBER: 'Comitê',
  STUDENT: 'Aluno',
};

export const INSTITUTION_STATUSES = ['ACTIVE', 'SUSPENDED', 'PILOT'] as const;
export type InstitutionStatus = (typeof INSTITUTION_STATUSES)[number];

export const STUDENT_STATUSES = [
  'ACTIVE',
  'TRUNCATED',
  'GRADUATED',
  'DROPPED',
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const CHARGE_STATUSES = [
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'FAILED',
  'REVERSED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BATCH_STATUSES = [
  'BUILDING',
  'SUBMITTED',
  'CONFIRMED',
  'FAILED',
] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const APPLICATION_STATUSES = [
  'ELIGIBLE',
  'INELIGIBLE',
  'AWARDED',
  'NOT_AWARDED',
  'APPEALED',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const AWARD_TIERS = ['A', 'B', 'C', 'D'] as const;
export type AwardTier = (typeof AWARD_TIERS)[number];

export const AWARD_STATUSES = [
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type AwardStatus = (typeof AWARD_STATUSES)[number];

export const PROPOSAL_TYPES = [
  'PRIORITY',
  'FUND_PERCENTAGE',
  'RULE_CHANGE',
] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

export const PROPOSAL_STATUSES = [
  'DRAFT',
  'OPEN',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const VOTE_CHOICES = ['APPROVE', 'REJECT', 'ABSTAIN'] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export const LEDGER_ENTRY_TYPES = [
  'REVENUE',
  'BANK_FEE',
  'PLATFORM_FEE',
  'PSP_COST',
  'FUND_CONTRIBUTION',
  'SCHOLARSHIP_PAID',
  'REFUND',
  'ADJUSTMENT',
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const LEDGER_DIRECTIONS = ['DEBIT', 'CREDIT'] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

export const ON_CHAIN_STATUSES = ['PENDING', 'ANCHORED', 'FAILED'] as const;
export type OnChainStatus = (typeof ON_CHAIN_STATUSES)[number];

export const ELIGIBILITY_CHECKS = ['PASS', 'FAIL'] as const;
export type EligibilityCheck = (typeof ELIGIBILITY_CHECKS)[number];

export const PRIORITY_FLAG_KEYS = [
  'PCD',
  'VIOLENCE',
  'DISASTER',
  'REFUGEE',
  'FAMILY_DISASTER',
  'PUBLIC_SERVANT_DEPENDENT',
] as const;
export type PriorityFlagKey = (typeof PRIORITY_FLAG_KEYS)[number];

export const VOTER_KINDS = ['STUDENT', 'COMMITTEE', 'AUDIT'] as const;
export type VoterKind = (typeof VOTER_KINDS)[number];

export const SCORING_KEYS = [
  'incomePerCapita',
  'dropoutRisk',
  'familyBurden',
  'territorialSocial',
  'academicContinuity',
  'prioritySituations',
] as const;
export type ScoringKey = (typeof SCORING_KEYS)[number];

export type ScoringWeights = Record<ScoringKey, number>;
export type TierCutoffs = { A: number; B: number; C: number };

export type Institution = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: InstitutionStatus;
  fundSharePct: string;
  _count: { students: number };
};

export type InstitutionDetail = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  logoUrl: string | null;
  status: InstitutionStatus;
  treasuryPub: string | null;
  feePayerPub: string | null;
  fundSharePct: string;
  createdAt: string;
  updatedAt: string;
  _count: { students: number; charges: number };
  scoringRuleVers: Array<{
    id: string;
    institutionId: string;
    version: number;
    label: string;
    weights: Record<string, number>;
    tierCutoffs: Record<string, number>;
    publishedAt: string;
    isActive: boolean;
    notes: string | null;
  }>;
};

export type ChargesByStatus = {
  status: ChargeStatus;
  count: number;
  amount: string;
};

export type FundSummary = {
  period: string;
  budget: string;
  contributed: string;
  distributed: string;
  available: string;
};

export type DashboardPayload = {
  institution: {
    id: string;
    name: string;
    fundSharePct: string;
    status: InstitutionStatus;
  };
  students: number;
  chargesByStatus: ChargesByStatus[];
  funds: FundSummary[];
  activeAwards: number;
  latestEconomy: {
    period: string;
    bankCostCurrent: string;
    netEconomy: string;
    fundAmount: string;
    fundSharePct: string;
    isVerified: boolean;
  } | null;
};

export type StudentListItem = {
  id: string;
  enrollmentCode: string;
  fullName: string;
  course: string;
  monthlyFee: string;
  status: StudentStatus;
  walletPub: string | null;
};

export type PriorityFlag = {
  id: string;
  profileId: string;
  flag: PriorityFlagKey;
  createdAt: string;
};

export type SocialProfile = {
  id: string;
  studentId: string;
  incomePerCapita: string;
  householdSize: number;
  dependentsCount: number;
  caresForElderlyOrPwd: boolean;
  overdueChargesCount: number;
  recentIncomeLoss: boolean;
  monthsSinceEnrollment: number | null;
  distanceKmToCampus: string | null;
  transportDifficulty: boolean;
  housingInstability: boolean;
  foodInsecurity: boolean;
  currentGradeAverage: string | null;
  attendancePct: string | null;
  priorityFlags: PriorityFlag[];
  documentsRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentDetail = {
  id: string;
  institutionId: string;
  userId: string | null;
  enrollmentCode: string;
  fullName: string;
  email: string | null;
  course: string;
  monthlyFee: string;
  status: StudentStatus;
  walletPub: string | null;
  intakeYear: number | null;
  createdAt: string;
  updatedAt: string;
  socialProfile: SocialProfile | null;
  charges: Charge[];
  applications: StudentApplication[];
  awards: ScholarshipAward[];
};

export type Charge = {
  id: string;
  reference: string;
  description: string;
  amount: string;
  dueDate: string;
  status: ChargeStatus;
  paidAt: string | null;
  batchId: string | null;
  student: {
    fullName: string;
    enrollmentCode: string;
    walletPub: string | null;
  };
  payment: {
    status: PaymentStatus;
    txSignature: string | null;
    feeSponsored: boolean;
    confirmedAt: string | null;
  } | null;
};

export type PaymentLink = {
  chargeId: string;
  reference: string;
  amount: string;
  dueDate: string;
  student: {
    fullName: string;
    enrollmentCode: string;
    walletPub: string | null;
  };
  payTo: string | null;
  network: string;
  feeSponsored: boolean;
  qrPayload: string;
};

export type GenerateMonthlyResult = {
  period: string;
  dueDate: string;
  created: number;
  skipped: number;
  total: number;
};

export type Batch = {
  id: string;
  institutionId: string;
  label: string;
  period: string;
  chargeCount: number;
  totalAmount: string;
  status: BatchStatus;
  txSignature: string | null;
  lookupTable: string | null;
  computeUnits: number | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { charges: number };
};

export type BatchDetail = Batch & {
  charges: Array<{
    id: string;
    institutionId: string;
    studentId: string;
    batchId: string | null;
    reference: string;
    description: string;
    amount: string;
    dueDate: string;
    status: ChargeStatus;
    paidAt: string | null;
    onchainRef: string | null;
    createdAt: string;
    updatedAt: string;
    student: { fullName: string; enrollmentCode: string };
  }>;
  ledger: LedgerEntry[];
};

export type BatchSettleResult = {
  batchId: string;
  chargeCount: number;
  totalAmount: string;
  status: string;
  txSignature: string | null;
  lookupTable: string | null;
  simulated: boolean;
  note: string;
};

export type EconomyReport = {
  id: string;
  institutionId: string;
  period: string;
  activeStudents: number;
  expectedLiquidation: number;
  bankFeePerLiquidation: string;
  bankCostCurrent: string;
  newVariableCost: string;
  platformFee: string;
  grossEconomy: string;
  netEconomy: string;
  fundSharePct: string;
  fundAmount: string;
  institutionBenefit: string;
  isVerified: boolean;
  createdAt: string;
};

export type EconomyPreview = Omit<EconomyReport, 'id' | 'createdAt'> & {
  disclaimer: string;
};

export type Fund = {
  id: string;
  institutionId: string;
  economyReportId: string;
  period: string;
  budget: string;
  contributed: string;
  distributed: string;
  reserved: string;
  createdAt: string;
  updatedAt: string;
};

export type FundListItem = Fund & {
  economyReport: EconomyReport | null;
  _count: { awards: number };
};

export type FundStats = {
  totals: {
    budget: string;
    contributed: string;
    distributed: string;
    reserved: string;
    available: string;
  };
  activeAwards: number;
  byTier: Array<{
    tier: AwardTier;
    count: number;
    monthlyTotal: string;
  }>;
};

export type ScholarshipAward = {
  id: string;
  applicationId: string;
  studentId: string;
  fundId: string;
  tier: AwardTier;
  coveragePct: string;
  monthlyValue: string;
  status: AwardStatus;
  startsAt: string;
  endsAt: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { fullName: string; enrollmentCode: string; course: string };
};

export type FundDetail = Fund & {
  economyReport: EconomyReport | null;
  awards: ScholarshipAward[];
};

export type ScoringRule = {
  version: number;
  label: string;
  weights: ScoringWeights;
  tierCutoffs: TierCutoffs;
};

export type CriterionScore = {
  key: ScoringKey;
  label: string;
  weight: number;
  earned: number;
  max: number;
  pct: number;
  evidence: string[];
};

export type ScorePreview = {
  studentId: string;
  rule: ScoringRule;
  result: {
    totalScore: number;
    breakdown: CriterionScore[];
    eligibility: { passed: boolean; reasons: string[] };
    suggestedTier: AwardTier | null;
  };
};

export type StudentApplication = {
  id: string;
  studentId: string;
  period: string;
  ruleVersionId: string;
  totalScore: string;
  eligibility: EligibilityCheck;
  status: ApplicationStatus;
  awardedTier: AwardTier | null;
  awardedValue: string | null;
  scoreBreakdown: unknown;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ruleVersion?: { version: number; label: string };
};

export type RankingItem = {
  applicationId: string;
  studentId: string;
  name: string;
  enrollmentCode: string;
  course: string;
  monthlyFee: string;
  totalScore: string;
  eligibility: EligibilityCheck;
  status: ApplicationStatus;
  suggestedTier: AwardTier | null;
  breakdown: unknown;
};

export type EvaluateResult = {
  period: string;
  ruleVersion: number;
  total: number;
  eligible: number;
  ineligible: number;
};

export type AllocateResult = {
  fundId: string;
  period: string;
  budget: string;
  grantedCount: number;
  deniedCount: number;
  remaining: string;
  granted: Array<{
    studentId: string;
    name: string;
    requestedTier: AwardTier;
    grantedTier: AwardTier;
    monthlyValue: string;
  }>;
  denied: Array<{
    studentId: string;
    name?: string;
    reason: string;
  }>;
};

export type ProposalAuthor = { name: string; role: Role };

export type ProposalVoteSummary = {
  voterKind: string;
  choice: VoteChoice;
  weight: number;
};

export type Proposal = {
  id: string;
  institutionId: string;
  authorId: string;
  type: ProposalType;
  title: string;
  description: string;
  status: ProposalStatus;
  voteDeadline: string;
  createdAt: string;
  closedAt: string | null;
  author: ProposalAuthor;
  votes: ProposalVoteSummary[];
  _count: { votes: number };
};

export type ProposalCreated = {
  id: string;
  institutionId: string;
  authorId: string;
  type: ProposalType;
  title: string;
  description: string;
  status: ProposalStatus;
  voteDeadline: string;
  createdAt: string;
  closedAt: string | null;
};

export type OnChainAnchor = {
  id: string;
  proposalId: string | null;
  entityType: string;
  entityId: string;
  payloadHash: string;
  network: string;
  txSignature: string | null;
  status: OnChainStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  anchoredAt: string | null;
};

export type ProposalDetail = ProposalCreated & {
  author: ProposalAuthor;
  votes: Array<{
    id: string;
    proposalId: string;
    voterId: string;
    voterKind: string;
    choice: VoteChoice;
    weight: number;
    onchainHash: string | null;
    createdAt: string;
    voter: ProposalAuthor;
  }>;
  onchain: OnChainAnchor | null;
};

export type Vote = {
  id: string;
  proposalId: string;
  voterId: string;
  voterKind: string;
  choice: VoteChoice;
  weight: number;
  onchainHash: string | null;
  createdAt: string;
};

export type Tally = {
  proposalId: string;
  approve: number;
  reject: number;
  abstain: number;
  voters: number;
  approveWeight: number;
  rejectWeight: number;
  totalWeight: number;
  passed: boolean;
};

export type CloseResult = {
  proposal: ProposalCreated;
  tally: Tally;
  anchor: OnChainAnchor;
};

export type AuditTrailItem = OnChainAnchor & {
  proposal: {
    id: string;
    title: string;
    type: ProposalType;
    status: ProposalStatus;
    closedAt: string | null;
  } | null;
};

export type LedgerEntry = {
  id: string;
  institutionId: string;
  batchId: string | null;
  awardId: string | null;
  type: LedgerEntryType;
  direction: LedgerDirection;
  amount: string;
  account: string;
  memo: string | null;
  onchainRef: string | null;
  createdAt: string;
};

export type LedgerBalance = {
  account: string;
  debit: string;
  credit: string;
  balance: string;
};

export type SocialImpact = {
  institutionId: string;
  totalDistributed: string;
  studentsBenefited: number;
  activeAwards: number;
  byTier: Array<{ tier: string; count: number; total: string }>;
  byCourse: Array<{ course: string; count: number; total: string }>;
};

export type SolanaStatus = {
  configured: boolean;
  pubkey: string | null;
  network: string;
  balanceSol: number | null;
  ready: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  institutionId: string | null;
};

export type UserAccount = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  institutionId: string | null;
  createdAt: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};