# Claritas — Arrecadação e Permanência Estudantil

Monorepo com o **backend** (API NestJS + Prisma + PostgreSQL/Supabase) e o **frontend**
(SPA React + Vite). A blockchain (Solana) entra como camada de auditoria; o produto é o
fundo de permanência estudantil.

## Estrutura

```
.
├── backend/    API NestJS (Prisma, JWT, Solana)   -> http://localhost:3000/api/v1
├── frontend/   SPA React + Vite + Tailwind         -> http://localhost:5173
└── scripts/    utilitários do monorepo
```

## Requisitos

- Node.js 20+ e npm
- Acesso a um banco PostgreSQL (o projeto usa Supabase)

## Backend

```bash
cd backend
npm install --include=dev          # o shell pode ter NODE_ENV=production; --include=dev garante o CLI do Nest
copy .env.example .env             # preencha DATABASE_URL, JWT_SECRET, etc.
npx prisma db push                 # cria o schema no banco
npm run seed                       # popula dados de demonstração
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173` (o `/api` é proxiado para o backend via Vite)

## Scripts do monorepo (na raiz)

| Comando                | O que faz                                   |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Sobe backend e frontend juntos              |
| `npm run dev:api`      | Só o backend (`start:dev`)                  |
| `npm run dev:web`      | Só o frontend (`vite`)                      |
| `npm run build`        | Builda backend e frontend                   |
| `npm run install:all`  | Instala as dependências dos dois            |
| `npm run seed`         | Popula o banco com dados de demonstração    |
| `npm run db:push`      | Aplica o schema do Prisma no banco          |

## Credenciais de demonstração (após o seed)

| Perfil      | E-mail                          | Senha        |
| ----------- | ------------------------------- | ------------ |
| Admin       | admin@claritas.app              | claritas123  |
| Financeiro  | financeiro@claritas.edu.br      | claritas123  |
| Comitê      | comite@claritas.edu.br          | claritas123  |
| Aluno       | aluno1@claritas.edu.br          | claritas123  |

No login, um usuário com papel `STUDENT` entra no **Portal do Aluno**; os demais papéis
entram no painel institucional.

## Segurança

- **Nunca commite `backend/.env`** — ele contém a connection string do banco, o
  `JWT_SECRET` e a `SUPABASE_SECRET_KEY`. Já está coberto pelo `.gitignore`.
- Use `backend/prisma/hardening.sql` no SQL Editor do Supabase para habilitar RLS e
  revogar o acesso público (`anon`/`authenticated`) à Data API.
