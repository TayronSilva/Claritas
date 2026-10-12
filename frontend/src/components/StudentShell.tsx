import { NavLink, useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

const NAV_ITEMS = [
  { to: '/portal', label: 'Início' },
  { to: '/portal/faturas', label: 'Minhas Faturas' },
  { to: '/portal/documentos', label: 'Documentos' },
  { to: '/portal/carteira', label: 'Carteira' },
];

export function StudentShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="w-full border-b border-outline-variant/60 bg-surface-container-lowest px-4 py-3 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-semibold tracking-tight text-primary">
                Claritas
              </span>
              <span className="hidden border-l border-outline-variant/60 pl-3 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant sm:inline">
                Portal do Aluno
              </span>
            </div>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/portal'}
                  className={({ isActive }) =>
                    `rounded px-3 py-1.5 transition-colors ${
                      isActive
                        ? 'bg-surface-container font-semibold text-on-surface'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right sm:flex">
              <span className="text-sm font-semibold text-on-surface">{user?.email}</span>
              <span className="font-mono text-[11px] text-on-surface-variant">Aluno</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {initials}
            </div>
            <button
              onClick={() => {
                signOut();
                navigate('/login');
              }}
              className="rounded px-2 py-1 text-sm text-on-surface-variant hover:bg-surface-container"
            >
              Sair
            </button>
          </div>
        </div>

        <nav className="mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/portal'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded px-2.5 py-1 text-xs ${
                  isActive
                    ? 'bg-surface-container font-semibold text-on-surface'
                    : 'text-on-surface-variant'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">{children}</main>

      <footer className="border-t border-outline-variant/60 bg-surface-container-lowest px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-on-surface-variant sm:flex-row">
          <span>Claritas © 2026 · Sistema de Gestão Escolar &amp; Financeira</span>
          <span>Ambiente seguro · Transações auditadas via Solana</span>
        </div>
      </footer>
    </div>
  );
}
