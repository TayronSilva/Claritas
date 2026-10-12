import { NavLink, useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { solanaApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { statusMeta } from '../lib/labels';

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/dashboard', label: 'Visão geral' },
  { to: '/cobrancas', label: 'Cobranças' },
  { to: '/lotes', label: 'Lotes' },
  { to: '/fundo', label: 'Fundo de permanência' },
  { to: '/bolsas', label: 'Bolsas' },
  { to: '/governanca', label: 'Governança' },
  { to: '/ledger', label: 'Ledger e impacto' },
  { to: '/alunos', label: 'Alunos' },
  { to: '/unidades', label: 'Polos & Unidades' },
  { to: '/relatorios', label: 'Relatórios' },
  { to: '/configuracoes', label: 'Configurações', end: true },
  { to: '/configuracoes/usuarios', label: 'Usuários e permissões' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, institution, institutions, signOut, selectInstitution } = useAuth();
  const navigate = useNavigate();
  const solana = useAsync(() => solanaApi.status(), []);
  const status = solana.data;
  const ready = status?.ready ?? false;

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-outline-variant/60 bg-surface-container-lowest lg:flex">
        <div className="border-b border-outline-variant/60 px-5 py-4">
          <p className="font-display text-lg font-semibold tracking-tight text-primary">
            Claritas
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
            Arrecadação e permanência
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-container/15 font-medium text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-outline-variant/60 p-3">
          <div className="mb-3 rounded border border-outline-variant/60 bg-surface-container-low px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              Rede Solana
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-success' : 'bg-warning'}`}
              />
              <span className="font-mono text-xs text-on-surface">
                {status ? status.network : '—'}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {ready ? 'fee payer ok' : 'simulado'}
              </span>
            </div>
          </div>

          <div className="rounded px-3 py-2">
            <p className="truncate text-sm font-medium text-on-surface">
              {institution?.name ?? 'Sem instituição'}
            </p>
            <p className="font-mono text-[11px] text-on-surface-variant">{user?.email}</p>
            <span className="mt-1 inline-block rounded border border-outline-variant/70 px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
              {user ? statusMeta.role(user.role).label : ''}
            </span>
          </div>

          <button
            onClick={() => {
              signOut();
              navigate('/login');
            }}
            className="mt-1 w-full rounded px-3 py-2 text-left text-sm text-on-surface-variant hover:bg-surface-container"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-outline-variant/60 bg-surface-container-lowest px-5 py-3">
          <nav className="flex gap-1 overflow-x-auto lg:hidden">
            {NAV_ITEMS.slice(0, 5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded px-2 py-1 text-xs ${
                    isActive ? 'bg-primary-container/15 font-medium text-primary' : 'text-on-surface-variant'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden lg:block" />

          {institutions.length > 1 && (
            <select
              value={institution?.id ?? ''}
              onChange={(e) => selectInstitution(e.target.value)}
              className="input w-auto py-1 text-xs"
              aria-label="Instituição"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          )}
        </header>

        <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}