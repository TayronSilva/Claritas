export type PriorityFlagKey =
  | 'PCD'
  | 'VIOLENCE'
  | 'DISASTER'
  | 'REFUGEE'
  | 'FAMILY_DISASTER'
  | 'PUBLIC_SERVANT_DEPENDENT';

export interface ScoringWeights {
  incomePerCapita: number;
  dropoutRisk: number;
  familyBurden: number;
  territorialSocial: number;
  academicContinuity: number;
  prioritySituations: number;
}

export interface TierCutoffs {
  A: number;
  B: number;
  C: number;
}

export interface ScoringRule {
  version: number;
  weights: ScoringWeights;
  tierCutoffs: TierCutoffs;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  incomePerCapita: 40,
  dropoutRisk: 20,
  familyBurden: 15,
  territorialSocial: 10,
  academicContinuity: 10,
  prioritySituations: 5,
};

export const DEFAULT_CUTOFFS: TierCutoffs = { A: 75, B: 50, C: 30 };

export type Tier = 'A' | 'B' | 'C' | 'D';

export const TIER_COVERAGE: Record<Tier, number> = {
  A: 100,
  B: 50,
  C: 25,
  D: 10,
};

export interface ScorableProfile {
  incomePerCapita: number;
  householdSize: number;
  dependentsCount: number;
  caresForElderlyOrPwd: boolean;
  overdueChargesCount: number;
  recentIncomeLoss: boolean;
  monthsSinceEnrollment: number | null;
  distanceKmToCampus: number | null;
  transportDifficulty: boolean;
  housingInstability: boolean;
  foodInsecurity: boolean;
  currentGradeAverage: number | null;
  attendancePct: number | null;
  priorityFlags: PriorityFlagKey[];
}

export interface ScorableStudent {
  status: 'ACTIVE' | 'TRUNCATED' | 'GRADUATED' | 'DROPPED';
  socialProfile: ScorableProfile | null;
}

export interface EligibilityResult {
  passed: boolean;
  reasons: string[];
}

export interface CriterionScore {
  key: keyof ScoringWeights;
  label: string;
  weight: number;
  earned: number;
  max: number;
  pct: number;
  evidence: string[];
}

export interface ScoringResult {
  totalScore: number;
  breakdown: CriterionScore[];
  eligibility: EligibilityResult;
  suggestedTier: Tier | null;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function checkEligibility(student: ScorableStudent): EligibilityResult {
  const reasons: string[] = [];

  if (student.status !== 'ACTIVE') {
    reasons.push('Aluno nao esta com matricula ativa.');
  }

  const profile = student.socialProfile;
  if (!profile) {
    reasons.push('Perfil socioeconomico nao preenchido.');
  } else {
    if (profile.householdSize < 1) {
      reasons.push('Composicao familiar invalida.');
    }
    if (profile.incomePerCapita < 0) {
      reasons.push('Renda per capita invalida.');
    }
  }

  return { passed: reasons.length === 0, reasons };
}

function scoreIncome(profile: ScorableProfile): { pct: number; evidence: string[] } {
  const evidence: string[] = [];
  const cap = profile.incomePerCapita;

  // Faixas espelhadas no intervalo de 0 a 6 salarios minimos por capita.
  let pct: number;
  if (cap <= 0.5) pct = 1;
  else if (cap <= 1) pct = 0.9;
  else if (cap <= 1.5) pct = 0.8;
  else if (cap <= 2) pct = 0.65;
  else if (cap <= 3) pct = 0.45;
  else if (cap <= 4) pct = 0.25;
  else if (cap <= 6) pct = 0.1;
  else pct = 0;

  evidence.push(`Renda familiar per capita: R$ ${cap.toFixed(2)}`);
  return { pct, evidence };
}

function scoreDropoutRisk(profile: ScorableProfile): { pct: number; evidence: string[] } {
  const evidence: string[] = [];
  const overdue = profile.overdueChargesCount;
  const loss = profile.recentIncomeLoss;

  const overdueComponent = clamp01(overdue / 3);
  const lossComponent = loss ? 1 : 0;
  const pct = clamp01(overdueComponent * 0.6 + lossComponent * 0.4);

  evidence.push(`Cobrancas em atraso: ${overdue}`);
  evidence.push(`Perda de renda recente: ${loss ? 'sim' : 'nao'}`);
  return { pct, evidence };
}

function scoreFamilyBurden(profile: ScorableProfile): { pct: number; evidence: string[] } {
  const evidence: string[] = [];
  const dependents = profile.dependentsCount;
  const care = profile.caresForElderlyOrPwd;

  const dependentsComponent = clamp01(dependents / 4);
  const careComponent = care ? 1 : 0;
  const pct = clamp01(dependentsComponent * 0.5 + careComponent * 0.5);

  evidence.push(`Dependentes: ${dependents}`);
  evidence.push(`Cuida de idoso ou PCD: ${care ? 'sim' : 'nao'}`);
  return { pct, evidence };
}

function scoreTerritorial(profile: ScorableProfile): { pct: number; evidence: string[] } {
  const evidence: string[] = [];
  const signals = [
    profile.transportDifficulty,
    profile.housingInstability,
    profile.foodInsecurity,
    (profile.distanceKmToCampus ?? 0) > 30,
  ];
  const hits = signals.filter(Boolean).length;

  evidence.push(`Transporte: ${profile.transportDifficulty ? 'dificil' : 'ok'}`);
  evidence.push(`Moradia instavel: ${profile.housingInstability ? 'sim' : 'nao'}`);
  evidence.push(`Inseguranca alimentar: ${profile.foodInsecurity ? 'sim' : 'nao'}`);
  evidence.push(
    `Distancia do campus: ${profile.distanceKmToCampus ?? 0} km`,
  );

  return { pct: hits / signals.length, evidence };
}

function scoreAcademic(
  profile: ScorableProfile,
  status: ScorableStudent['status'],
): { pct: number; evidence: string[] } {
  const evidence: string[] = [];

  if (status !== 'ACTIVE') {
    return { pct: 0, evidence: ['Matricula nao ativa'] };
  }

  const grade = profile.currentGradeAverage;
  const attendance = profile.attendancePct;

  // Criterio de continuidade nunca pune a vulnerabilidade economica:
  // quem tem renda baixa nao tem por que ter media alta.
  const gradeComponent = grade === null ? 0.5 : clamp01(grade / 10);
  const attendanceComponent =
    attendance === null ? 0.5 : clamp01(attendance / 100);

  const pct = clamp01(gradeComponent * 0.5 + attendanceComponent * 0.5);

  evidence.push(`Media atual: ${grade ?? 'nao informada'}`);
  evidence.push(`Frequencia: ${attendance ?? 'nao informada'}%`);
  return { pct, evidence };
}

function scorePriority(profile: ScorableProfile): { pct: number; evidence: string[] } {
  const evidence = profile.priorityFlags.length
    ? profile.priorityFlags.map((f) => `Prioridade: ${f}`)
    : ['Nenhuma situacao prioritaria declarada'];

  return { pct: clamp01(profile.priorityFlags.length / 2), evidence };
}

export function scoreStudent(
  student: ScorableStudent,
  rule: ScoringRule = {
    version: 1,
    weights: DEFAULT_WEIGHTS,
    tierCutoffs: DEFAULT_CUTOFFS,
  },
): ScoringResult {
  const eligibility = checkEligibility(student);

  if (!student.socialProfile) {
    return {
      totalScore: 0,
      breakdown: [],
      eligibility,
      suggestedTier: null,
    };
  }

  const profile = student.socialProfile;
  const scored: CriterionScore[] = [
    {
      key: 'incomePerCapita',
      label: 'Renda familiar per capita',
      ...wrap('incomePerCapita', 'Renda familiar per capita', rule, scoreIncome(profile)),
    },
    {
      key: 'dropoutRisk',
      label: 'Risco de evasão',
      ...wrap('dropoutRisk', 'Risco de evasão', rule, scoreDropoutRisk(profile)),
    },
    {
      key: 'familyBurden',
      label: 'Encargos familiares',
      ...wrap('familyBurden', 'Encargos familiares', rule, scoreFamilyBurden(profile)),
    },
    {
      key: 'territorialSocial',
      label: 'Vulnerabilidade territorial/social',
      ...wrap(
        'territorialSocial',
        'Vulnerabilidade territorial/social',
        rule,
        scoreTerritorial(profile),
      ),
    },
    {
      key: 'academicContinuity',
      label: 'Continuidade acadêmica',
      ...wrap(
        'academicContinuity',
        'Continuidade acadêmica',
        rule,
        scoreAcademic(profile, student.status),
      ),
    },
    {
      key: 'prioritySituations',
      label: 'Situações prioritárias',
      ...wrap(
        'prioritySituations',
        'Situações prioritárias',
        rule,
        scorePriority(profile),
      ),
    },
  ];

  const totalScore = Number(
    scored.reduce((acc, c) => acc + c.earned, 0).toFixed(2),
  );

  return {
    totalScore,
    breakdown: scored,
    eligibility,
    suggestedTier: eligibility.passed
      ? resolveTier(totalScore, rule.tierCutoffs)
      : null,
  };
}

function wrap(
  key: keyof ScoringWeights,
  label: string,
  rule: ScoringRule,
  computed: { pct: number; evidence: string[] },
): { weight: number; earned: number; max: number; pct: number; evidence: string[] } {
  const weight = rule.weights[key];
  const pct = computed.pct;
  return {
    weight,
    earned: Number((weight * pct).toFixed(2)),
    max: weight,
    pct: Number(pct.toFixed(4)),
    evidence: computed.evidence,
  };
}

export function resolveTier(
  totalScore: number,
  cutoffs: TierCutoffs = DEFAULT_CUTOFFS,
): Tier | null {
  if (totalScore >= cutoffs.A) return 'A';
  if (totalScore >= cutoffs.B) return 'B';
  if (totalScore >= cutoffs.C) return 'C';
  if (totalScore > 0) return 'D';
  return null;
}

export function coverageForTier(tier: Tier): number {
  return TIER_COVERAGE[tier] ?? 0;
}
