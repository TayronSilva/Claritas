const WEAK_SECRETS = new Set([
  'dev-secret',
  'secret',
  'changeme',
  'troque-este-valor-em-producao',
]);

export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];

  const databaseUrl = String(config.DATABASE_URL ?? '').trim();
  if (!databaseUrl) {
    errors.push('DATABASE_URL e obrigatoria');
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL deve ser uma connection string postgresql://');
  }

  const jwtSecret = String(config.JWT_SECRET ?? '').trim();
  if (!jwtSecret) {
    errors.push('JWT_SECRET e obrigatoria');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET deve ter ao menos 32 caracteres');
  } else if (WEAK_SECRETS.has(jwtSecret)) {
    errors.push('JWT_SECRET usa um valor padrao conhecido; troque por um aleatorio');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuracao de ambiente invalida:\n - ${errors.join('\n - ')}`,
    );
  }

  return config;
}
