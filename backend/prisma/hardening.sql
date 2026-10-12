-- Claritas - hardening do banco Supabase
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
--
-- Contexto: o app acessa o Postgres via Prisma usando o role `postgres` (owner
-- e superuser, que ignora RLS). Logo, habilitar RLS NAO quebra a API da aplicacao,
-- mas fecha a porta da Data API publica (PostgREST), que responde a qualquer um
-- que tenha a chave anon/publishable.

-- 1) Habilita Row Level Security em TODAS as tabelas do schema public.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- 2) Remove qualquer acesso dos roles publicos usados pela Data API.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON SCHEMA public FROM anon, authenticated;

-- 3) Vale tambem para tabelas criadas no futuro (proximas migrations do Prisma).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 4) Conferencia: nenhuma tabela deve ficar com RLS desabilitado.
--    Se retornar linhas, o passo 1 nao cobriu algo.
SELECT schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
