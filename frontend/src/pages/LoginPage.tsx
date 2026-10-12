import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Alert } from '../components/Layout';
import { ApiError } from '../api/client';

const DEMO_ACCOUNTS = [
  { label: 'Financeiro', email: 'financeiro@claritas.edu.br' },
  { label: 'Comitê', email: 'comite@claritas.edu.br' },
  { label: 'Aluno', email: 'aluno1@claritas.edu.br' },
  { label: 'Admin', email: 'admin@claritas.app' },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('financeiro@claritas.edu.br');
  const [password, setPassword] = useState('claritas123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[32px] font-semibold leading-10 text-primary">
            Claritas
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Infraestrutura de arrecadação e permanência estudantil
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6"
        >
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <Button type="submit" loading={loading} className="mt-5 w-full">
            Entrar
          </Button>
        </form>

        <div className="mt-6 rounded-lg border border-outline-variant/60 bg-surface-container-low p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
            Contas de demonstração
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword('claritas123');
                }}
                className={`rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                  email === account.email
                    ? 'bg-primary-container/15 font-medium text-primary'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {account.label}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-on-surface-variant">
            senha: claritas123
          </p>
        </div>
      </div>
    </div>
  );
}