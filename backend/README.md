# Claritas API

Infraestrutura de arrecadação e permanencia estudantil.
Blockchain (Solana) como camada de auditoria. O produto e o fundo de permanencia.

## Rodando

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL
npx prisma migrate dev    # cria o schema
npm run seed              # popula 1000 alunos + economia + proposta
npm run start:dev
```

Swagger em `http://localhost:3000/docs`.

## Credenciais do seed

| Papel | Email | Senha |
|---|---|---|
| Plataforma | `admin@claritas.app` | `claritas123` |
| Financeiro | `financeiro@claritas.edu.br` | `claritas123` |
| Comite | `comite@claritas.edu.br` | `claritas123` |
| Aluno | `aluno1@claritas.edu.br` | `claritas123` |

## Autenticacao

`POST /api/v1/auth/login` devolve `accessToken`. Enviar como
`Authorization: Bearer <token>`. Todos os endpoints exceto `auth/login`,
`auth/register` e `solana/status` exigem o token.

Base: `http://localhost:3000/api/v1`

---

## Contrato

### Auth

**POST /auth/login**
```json
// request
{ "email": "financeiro@claritas.edu.br", "password": "claritas123" }
// response 201
{ "accessToken": "eyJ...", "user": { "id": "...", "email": "...", "name": "Ana Ribeiro", "role": "INSTITUTION_FINANCE", "institutionId": "..." } }
```

**GET /auth/me** -> `{ "id", "email", "role", "institutionId" }`

### Instituicoes

**GET /institutions**
```json
[{ "id": "...", "name": "Universidade Claritas", "slug": "claritas", "logoUrl": null, "status": "PILOT", "fundSharePct": 30, "_count": { "students": 1000 } }]
```

**GET /institutions/dashboard/:id**
```json
{
  "institution": { "id": "...", "name": "...", "fundSharePct": 30, "status": "PILOT" },
  "students": 918,
  "chargesByStatus": [{ "status": "PENDING", "count": 950, "amount": "845000.00" }],
  "funds": [{ "period": "2026-10", "budget": "0.00", "contributed": "0.00", "distributed": "0.00", "available": "0.00" }],
  "activeAwards": 0,
  "latestEconomy": { "period": "2026-10", "bankCostCurrent": "...",
    "netEconomy": "...", "fundAmount": "...", "fundSharePct": "30", "isVerified": false }
}
```

### Alunos

**GET /students?institutionId=&status=&take=&skip=**
```json
[{ "id": "...", "enrollmentCode": "2400001", "fullName": "Ana Silva", "course": "Direito", "monthlyFee": "890.00", "status": "ACTIVE", "walletPub": null }]
```

**GET /students/:id** -> aluno + `socialProfile` + ultimas `charges` + `applications` + `awards` ativos.

**GET /students/enrollment/:institutionId/:code** -> busca por matricula.

### Cobrancas

**GET /charges?institutionId=&status=&studentId=&take=&skip=**
```json
[{ "id": "...", "reference": "2026-10-00000001", "description": "Mensalidade 2026-10",
   "amount": "890.00", "dueDate": "2026-10-10T00:00:00.000Z", "status": "PENDING",
   "paidAt": null, "student": { "fullName": "Ana Silva", "enrollmentCode": "2400001", "walletPub": null },
   "batchId": null,
   "payment": { "status": "PENDING", "txSignature": null, "feeSponsored": true, "confirmedAt": null } }]
```

**POST /charges/generate** `{ "institutionId": "...", "period": "2026-10" }`
-> `{ "period": "2026-10", "dueDate": "...", "created": 918, "skipped": 0, "total": 918 }`

**GET /charges/:id/link** -> link de pagamento do aluno
```json
{ "chargeId": "...", "reference": "2026-10-00000001", "amount": "890.00",
  "dueDate": "...", "student": { "fullName": "...", "enrollmentCode": "...", "walletPub": null },
  "payTo": null, "network": "devnet",
  "feeSponsored": true,
  "qrPayload": "claritas://pay/2026-10-00000001" }
```

**POST /charges/confirm**
```json
{ "chargeId": "...", "txSignature": "5x...", "payerPub": "...", "idempotencyKey": "uuid-1" }
// response
{ "duplicated": false, "paymentId": "...", "chargeStatus": "PAID", "txSignature": "5x..." }
```
Idempotente: repetir a mesma `idempotencyKey` devolve `{ "duplicated": true }` e nao gera dois creditos.

### Lotes

**GET /batches?institutionId=** -> lista de lotes.

**POST /batches/settle** `{ "institutionId": "...", "period": "2026-10" }`
```json
{ "batchId": "...", "chargeCount": 918, "totalAmount": "845000.00",
  "status": "CONFIRMED", "txSignature": "a1b2...", "lookupTable": "...",
  "simulated": false,
  "note": "Lote consolidado. Split executado na mesma transacao." }
```
Sem `SOLANA_FEE_PAYER_SECRET_KEY`, `simulated: true` e consolida localmente.

### Bolsas

**GET /scholarships/rule/:institutionId**
```json
{ "version": 1, "label": "Regra inicial",
  "weights": { "incomePerCapita": 40, "dropoutRisk": 20, "familyBurden": 15,
               "territorialSocial": 10, "academicContinuity": 10, "prioritySituations": 5 },
  "tierCutoffs": { "A": 75, "B": 50, "C": 30 } }
```

**POST /scholarships/rule/:institutionId/publish**
`{ "weights": {...}, "tierCutoffs": {...} }` -> nova versao, anterior desativada.

**GET /scholarships/preview/:studentId**
```json
{ "studentId": "...", "rule": { "version": 1, ... },
  "result": {
    "totalScore": 78.5,
    "breakdown": [{ "key": "incomePerCapita", "label": "Renda familiar per capita",
      "weight": 40, "earned": 36, "max": 40, "pct": 0.9,
      "evidence": ["Renda familiar per capita: R$ 480.00"] }],
    "eligibility": { "passed": true, "reasons": [] },
    "suggestedTier": "A" } }
```

**POST /scholarships/evaluate** `{ "institutionId": "...", "period": "2026-10" }`
-> `{ "period": "2026-10", "ruleVersion": 1, "total": 918, "eligible": 912, "ineligible": 6 }`

**GET /scholarships/ranking?institutionId=&period=**
```json
[{ "applicationId": "...", "studentId": "...", "name": "Ana Silva",
   "enrollmentCode": "2400001", "course": "Direito", "monthlyFee": "890.00",
   "totalScore": "88.20", "eligibility": "PASS", "status": "ELIGIBLE",
   "suggestedTier": "A", "breakdown": [...] }]
```

**POST /scholarships/allocate** `{ "institutionId": "...", "period": "2026-10", "fundId": "..." }`
```json
{ "fundId": "...", "period": "2026-10", "budget": "...",
  "grantedCount": 12, "deniedCount": 900, "remaining": "...",
  "granted": [{ "studentId": "...", "name": "Ana Silva",
    "requestedTier": "A", "grantedTier": "B", "monthlyValue": "445.00" }],
  "denied": [{ "studentId": "...", "name": "...", "reason": "Orcamento do fundo esgotado" }] }
```
Ordena por pontuacao, concede a maior faixa possivel e degrada a faixa se o
orcamento acabar.

### Fundo e economia

**POST /fund/economy/preview** e **POST /fund/economy**
```json
{ "institutionId": "...", "period": "2026-10",
  "bankFeePerLiquidation": 7, "newVariableCostPerPayment": 0.3,
  "platformFeePerStudent": 0.8, "platformFeePerLiquidation": 1.2 }
```
-> `{ "activeStudents", "expectedLiquidation", "bankCostCurrent", "newVariableCost",
      "platformFee", "grossEconomy", "netEconomy", "fundSharePct", "fundAmount",
      "institutionBenefit", "isVerified": false, "disclaimer": "..." }`

**POST /fund/create** `{ "institutionId", "period" }` -> cria o fundo a partir do relatorio.

**POST /fund/:id/contribute** `{ "amount": 1200.00, "txSignature": "..." }`

**GET /fund/stats/:institutionId**
```json
{ "totals": { "budget": "...", "contributed": "...", "distributed": "...", "reserved": "...", "available": "..." },
  "activeAwards": 12,
  "byTier": [{ "tier": "A", "count": 2, "monthlyTotal": "1780.00" }] }
```

**GET /fund/detail/:id** -> fundo + relatorio + bolsas concedidas.

### Governanca

**GET /governance/proposals?institutionId=&status=**

**POST /governance/proposals**
```json
{ "institutionId": "...", "type": "FUND_PERCENTAGE",
  "title": "Percentual do fundo", "description": "...",
  "voteDeadline": "2026-10-30T23:59:59.000Z" }
```
`type` aceita apenas `PRIORITY` ou `FUND_PERCENTAGE`. Casos individuais nao entram em votacao popular.

**POST /governance/proposals/:id/vote** `{ "choice": "APPROVE", "weight": 1 }`

**GET /governance/proposals/:id/tally**
-> `{ "approve", "reject", "abstain", "voters", "approveWeight", "rejectWeight", "totalWeight", "passed" }`

**POST /governance/proposals/:id/close** -> fecha e ancora o hash.

**GET /governance/audit/:institutionId** -> trilha de auditoria ancorada.

### Ledger

**GET /ledger/entries?institutionId=&type=&take=&skip=**

**GET /ledger/balances/:institutionId** -> saldo por conta.

**GET /ledger/impact/:institutionId**
```json
{ "institutionId": "...", "totalDistributed": "...",
  "studentsBenefited": 12, "activeAwards": 12,
  "byTier": [...], "byCourse": [{ "course": "Direito", "count": 4, "total": "..." }] }
```

### Solana

**GET /solana/status** (publico)
```json
{ "configured": false, "pubkey": null, "network": "devnet", "balanceSol": null, "ready": false }
```

**POST /solana/confirm** `{ "signature": "..." }`
**POST /solana/hash** `{ ...payload }` -> `{ "payloadHash": "a1b2c3d4e5f60718" }`

---

## Papéis

| Papel | Acessa |
|---|---|
| `PLATFORM_ADMIN` | tudo |
| `INSTITUTION_FINANCE` | financeiro, fundo, lotes, governanca |
| `COMMITTEE_MEMBER` | ranking, propostas, votos |
| `STUDENT` | propria matricula, cobrancas, bolsa |

## Observacoes de produto

- Nenhum dado pessoal vai para a blockchain. A cadeia guarda apenas hash, versao da regra e decisao.
- O aluno nunca ve taxa de transacao: o fee payer e a plataforma.
- "Economia liquida" e premissa de planejamento ate a instituicao fornecer o convenio bancario real.
