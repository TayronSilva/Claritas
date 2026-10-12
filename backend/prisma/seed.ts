import {
  AwardTier,
  ChargeStatus,
  InstitutionStatus,
  Prisma,
  PrismaClient,
  ProposalStatus,
  ProposalType,
  Role,
  StudentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const INSTITUTION_NAME = process.env.SEED_INSTITUTION_NAME ?? 'Universidade Claritas';
const STUDENT_COUNT = Number(process.env.SEED_STUDENT_COUNT ?? 1000);
const PASSWORD = process.env.SEED_PASSWORD ?? 'claritas123';
const PERIOD = new Date().toISOString().slice(0, 7);

const COURSES = [
  'Administracao',
  'Direito',
  'Engenharia de Software',
  'Medicina',
  'Economia',
  'Psicologia',
  'Enfermagem',
  'Ciencia da Computacao',
  'Letras',
  'Biomedicina',
];

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'Joao', 'Karina', 'Lucas', 'Mariana', 'Nathan', 'Olivia', 'Pedro',
  'Rafaela', 'Samuel', 'Tatiane', 'Vinicius', 'Yasmin', 'Caio', 'Larissa', 'Otavio',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
  'Pereira', 'Lima', 'Gomes', 'Ribeiro', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias',
];

const PRIORITY_POOL = [
  'PCD',
  'VIOLENCE',
  'DISASTER',
  'REFUGEE',
  'FAMILY_DISASTER',
  'PUBLIC_SERVANT_DEPENDENT',
] as const;

// Distribuicao skewed: poucos casos extremos, muitos no meio.
// Isso produz ranking com cortes visiveis, que e o que a demo precisa mostrar.
function gaussian(mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function main() {
  console.log(`Seed: ${INSTITUTION_NAME} / ${STUDENT_COUNT} alunos / periodo ${PERIOD}`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ---------------------------------------------------------------- instituicao
  const institution = await prisma.institution.upsert({
    where: { slug: 'claritas' },
    create: {
      name: INSTITUTION_NAME,
      slug: 'claritas',
      status: InstitutionStatus.PILOT,
      fundSharePct: new Prisma.Decimal(30),
      treasuryPub: process.env.SOLANA_TREASURY_PUBKEY || null,
      feePayerPub: process.env.SOLANA_FEE_PAYER_SECRET_KEY ? 'configurada' : null,
    },
    update: {},
  });

  console.log(`Instituicao ${institution.id}`);

  // ---------------------------------------------------------------- usuarios
  const finance = await prisma.user.upsert({
    where: { email: 'financeiro@claritas.edu.br' },
    create: {
      email: 'financeiro@claritas.edu.br',
      passwordHash,
      name: 'Ana Ribeiro',
      role: Role.INSTITUTION_FINANCE,
      institutionId: institution.id,
    },
    update: {},
  });

  const committee = await prisma.user.upsert({
    where: { email: 'comite@claritas.edu.br' },
    create: {
      email: 'comite@claritas.edu.br',
      passwordHash,
      name: 'Comite de Bolsas',
      role: Role.COMMITTEE_MEMBER,
      institutionId: institution.id,
    },
    update: {},
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@claritas.app' },
    create: {
      email: 'admin@claritas.app',
      passwordHash,
      name: 'Equipe Claritas',
      role: Role.PLATFORM_ADMIN,
    },
    update: {},
  });

  console.log('Usuarios de papel criados');

  // ---------------------------------------------------------------- comissao
  const studentRep = await prisma.user.findFirst({
    where: { institutionId: institution.id, role: Role.STUDENT },
  });

  if (studentRep) {
    await prisma.appealCommittee.upsert({
      where: { id: `rep-${institution.id}` },
      create: {
        id: `rep-${institution.id}`,
        institutionId: institution.id,
        userId: studentRep.id,
        isStudentRep: true,
      },
      update: {},
    });
  }

  await prisma.appealCommittee.upsert({
    where: { id: `ind-${institution.id}` },
    create: {
      id: `ind-${institution.id}`,
      institutionId: institution.id,
      userId: committee.id,
      isIndependent: true,
    },
    update: {},
  });

  // ---------------------------------------------------------------- alunos
  const existingStudents = await prisma.student.count({
    where: { institutionId: institution.id },
  });

  if (existingStudents >= STUDENT_COUNT) {
    console.log(`Ja existem ${existingStudents} alunos. Pulando geracao.`);
  } else {
    const toCreate = STUDENT_COUNT - existingStudents;
    const students: Prisma.StudentCreateManyInput[] = [];
    const profiles: Prisma.SocialProfileCreateManyInput[] = [];

    for (let i = 0; i < toCreate; i++) {
      const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const fullName = `${first} ${last}`;
      const studentId = `seed-${institution.id.slice(-4)}-${i.toString().padStart(5, '0')}`;

      // Status: 92% ativos, resto para dar textura a dashboard
      const roll = Math.random();
      const status =
        roll > 0.92
          ? StudentStatus.TRUNCATED
          : roll > 0.88
            ? StudentStatus.GRADUATED
            : StudentStatus.ACTIVE;

      const course = COURSES[Math.floor(Math.random() * COURSES.length)];
      const monthlyFee = new Prisma.Decimal(
        Math.round(clamp(gaussian(890, 260), 380, 2400)),
      ).toDecimalPlaces(2);

      const student: Prisma.StudentCreateManyInput = {
        id: studentId,
        institutionId: institution.id,
        enrollmentCode: `${(2400000 + i).toString()}`,
        fullName,
        course,
        monthlyFee,
        status,
        intakeYear: 2022 + Math.floor(Math.random() * 4),
      };
      students.push(student);

      // Perfil socioeconomico: renda baixa correlaciona com carga familiar.
      const income = Math.max(
        120,
        Math.round(clamp(gaussian(1650, 850), 120, 7000)),
      );
      const household = 1 + Math.floor(Math.random() * 5);
      const dependents = Math.random() > 0.55 ? Math.floor(Math.random() * 4) : 0;
      const overdue = Math.random() > 0.72 ? 1 + Math.floor(Math.random() * 3) : 0;

      profiles.push({
        id: `prof-${studentId}`,
        studentId,
        incomePerCapita: new Prisma.Decimal(income),
        householdSize: household,
        dependentsCount: dependents,
        caresForElderlyOrPwd: Math.random() > 0.78,
        overdueChargesCount: overdue,
        recentIncomeLoss: Math.random() > 0.82,
        monthsSinceEnrollment: 6 + Math.floor(Math.random() * 30),
        distanceKmToCampus: new Prisma.Decimal(
          Math.round(clamp(gaussian(14, 18), 0, 180)),
        ),
        transportDifficulty: Math.random() > 0.68,
        housingInstability: Math.random() > 0.85,
        foodInsecurity: Math.random() > 0.8,
        currentGradeAverage: new Prisma.Decimal(
          clamp(gaussian(7.2, 1.4), 0, 10).toFixed(2),
        ),
        attendancePct: new Prisma.Decimal(
          Math.round(clamp(gaussian(82, 14), 40, 100)),
        ),
      });
    }

    for (let i = 0; i < students.length; i += 500) {
      await prisma.student.createMany({ data: students.slice(i, i + 500) });
    }
    for (let i = 0; i < profiles.length; i += 500) {
      await prisma.socialProfile.createMany({ data: profiles.slice(i, i + 500) });
    }

    console.log(`${students.length} alunos e perfis criados`);
  }

  // ---------------------------------------------------------------- flags
  const withoutFlags = await prisma.socialProfile.findMany({
    where: { priorityFlags: { none: {} } },
    take: Math.round(STUDENT_COUNT * 0.25),
    select: { id: true },
  });

  for (const profile of withoutFlags) {
    const flags =
      Math.random() > 0.6
        ? [PRIORITY_POOL[Math.floor(Math.random() * PRIORITY_POOL.length)]]
        : [];

    if (flags.length) {
      await prisma.priorityFlag.createMany({
        data: flags.map((flag) => ({ profileId: profile.id, flag })),
      });
    }
  }

  // ---------------------------------------------------------------- usuarios de aluno
  const studentsForLogin = await prisma.student.findMany({
    where: { institutionId: institution.id, userId: null, status: StudentStatus.ACTIVE },
    take: 3,
  });

  for (const [index, student] of studentsForLogin.entries()) {
    const email = `aluno${index + 1}@claritas.edu.br`;
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        name: student.fullName,
        role: Role.STUDENT,
        institutionId: institution.id,
      },
      update: {},
    });

    await prisma.student.update({
      where: { id: student.id },
      data: { userId: user.id },
    });
  }

  console.log('Logins de aluno criados: aluno1@claritas.edu.br ... aluno3@claritas.edu.br');

  // ---------------------------------------------------------------- regra
  await prisma.scoringRuleVersion.upsert({
    where: { institutionId_version: { institutionId: institution.id, version: 1 } },
    create: {
      institutionId: institution.id,
      version: 1,
      label: 'Regra inicial',
      weights: {
        incomePerCapita: 40,
        dropoutRisk: 20,
        familyBurden: 15,
        territorialSocial: 10,
        academicContinuity: 10,
        prioritySituations: 5,
      } as Prisma.InputJsonValue,
      tierCutoffs: { A: 75, B: 50, C: 30 } as Prisma.InputJsonValue,
      isActive: true,
    },
    update: {},
  });

  // ---------------------------------------------------------------- economia
  const activeStudents = await prisma.student.count({
    where: { institutionId: institution.id, status: StudentStatus.ACTIVE },
  });
  const expectedLiquidation = Math.round(activeStudents * 0.95);
  const bankFee = new Prisma.Decimal(7);
  const bankCost = bankFee.mul(expectedLiquidation);
  const newCost = new Prisma.Decimal(0.3).mul(expectedLiquidation);
  const platformFee = new Prisma.Decimal(0.8)
    .mul(activeStudents)
    .plus(new Prisma.Decimal(1.2).mul(expectedLiquidation));
  const netEconomy = bankCost.minus(newCost).minus(platformFee);
  const fundSharePct = new Prisma.Decimal(30);
  const fundAmount = netEconomy.mul(fundSharePct).div(100).toDecimalPlaces(2);

  const report = await prisma.economyReport.upsert({
    where: { institutionId_period: { institutionId: institution.id, period: PERIOD } },
    create: {
      institutionId: institution.id,
      period: PERIOD,
      activeStudents,
      expectedLiquidation,
      bankFeePerLiquidation: bankFee,
      bankCostCurrent: bankCost,
      newVariableCost: newCost,
      platformFee,
      grossEconomy: bankCost,
      netEconomy,
      fundSharePct,
      fundAmount,
      institutionBenefit: netEconomy.minus(fundAmount),
      isVerified: false,
    },
    update: {},
  });

  await prisma.fund.upsert({
    where: { economyReportId: report.id },
    create: {
      institutionId: institution.id,
      economyReportId: report.id,
      period: PERIOD,
      budget: fundAmount,
      contributed: 0,
      distributed: 0,
      reserved: 0,
    },
    update: {},
  });

  console.log(
    `Economia ${PERIOD}: custo atual ${bankCost.toString()} | economia liquida ${netEconomy.toString()} | fundo 30% = ${fundAmount.toString()}`,
  );

  // ---------------------------------------------------------------- cobrancas
  const [year, month] = PERIOD.split('-').map(Number);
  const dueDate = new Date(Date.UTC(year, month - 1, 10));

  const activeStudentsList = await prisma.student.findMany({
    where: { institutionId: institution.id, status: StudentStatus.ACTIVE },
    select: { id: true, monthlyFee: true },
  });

  const chargeRows: Prisma.ChargeCreateManyInput[] = activeStudentsList.map((s) => ({
    institutionId: institution.id,
    studentId: s.id,
    reference: `${PERIOD}-${s.id.slice(-8)}`,
    description: `Mensalidade ${PERIOD}`,
    amount: s.monthlyFee,
    dueDate,
    status: ChargeStatus.PENDING,
  }));

  for (let i = 0; i < chargeRows.length; i += 500) {
    await prisma.charge.createMany({
      data: chargeRows.slice(i, i + 500),
      skipDuplicates: true,
    });
  }

  console.log(`${chargeRows.length} cobrancas geradas para ${PERIOD}`);

  // ---------------------------------------------------------------- governanca
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);

  const proposal = await prisma.proposal.upsert({
    where: { id: `prop-pct-${institution.id}` },
    create: {
      id: `prop-pct-${institution.id}`,
      institutionId: institution.id,
      authorId: finance.id,
      type: ProposalType.FUND_PERCENTAGE,
      title: 'Percentual do fundo de permanência',
      description:
        'Proposta de elevar o percentual da economia líquida destinado ao fundo de 30% para 40%. A votação é sobre prioridade geral; casos individuais seguem comitê sob regras objetivas.',
      status: ProposalStatus.OPEN,
      voteDeadline: deadline,
    },
    update: {},
  });

  await prisma.vote.upsert({
    where: {
      proposalId_voterId: { proposalId: proposal.id, voterId: committee.id },
    },
    create: {
      proposalId: proposal.id,
      voterId: committee.id,
      voterKind: 'COMMITTEE',
      choice: 'APPROVE',
      weight: 3,
    },
    update: {},
  });

  if (studentRep) {
    await prisma.vote.upsert({
      where: {
        proposalId_voterId: { proposalId: proposal.id, voterId: studentRep.id },
      },
      create: {
        proposalId: proposal.id,
        voterId: studentRep.id,
        voterKind: 'STUDENT',
        choice: 'APPROVE',
        weight: 1,
      },
      update: {},
    });
  }

  console.log('Proposta de governanca criada');

  console.log('\n--- Credenciais ---');
  console.log(`Admin:       admin@claritas.app / ${PASSWORD}`);
  console.log(`Financeiro:  financeiro@claritas.edu.br / ${PASSWORD}`);
  console.log(`Comite:      comite@claritas.edu.br / ${PASSWORD}`);
  console.log(`Aluno:       aluno1@claritas.edu.br / ${PASSWORD}`);
  console.log(`\nInstitution ID: ${institution.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
