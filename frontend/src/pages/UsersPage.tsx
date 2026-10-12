import { useState, type FormEvent } from 'react';
import { usersApi } from '../api';
import type { Role } from '../api/types';
import { useAsync } from '../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { statusMeta } from '../lib/labels';
import { formatDate, formatNumber } from '../lib/format';
import { ApiError } from '../api/client';

const ROLE_OPTIONS: Role[] = [
  'PLATFORM_ADMIN',
  'INSTITUTION_FINANCE',
  'COMMITTEE_MEMBER',
  'STUDENT',
];

export function UsersPage() {
  const users = useAsync(() => usersApi.list(), []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('INSTITUTION_FINANCE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await usersApi.invite({ name, email, role });
      setOpen(false);
      setName('');
      setEmail('');
      users.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao convidar usuário');
    } finally {
      setSaving(false);
    }
  }

  if (users.loading) return <LoadingBlock label="Carregando usuários" />;
  if (users.error) return <ErrorBlock message={users.error} onRetry={users.reload} />;
  const list = users.data ?? [];

  return (
    <>
      <PageHeader
        title="Usuários e Permissões"
        description="Gerencie operadores, administradores e políticas de auditoria institucional."
        actions={
          <Button onClick={() => setOpen(true)}>+ Convidar usuário</Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Usuários ativos" value={formatNumber(list.filter((u) => u.isActive).length)} />
        <StatCard
          label="Administradores"
          value={formatNumber(list.filter((u) => u.role === 'PLATFORM_ADMIN').length)}
        />
        <StatCard
          label="Financeiro / Comitê"
          value={formatNumber(
            list.filter((u) => u.role === 'INSTITUTION_FINANCE' || u.role === 'COMMITTEE_MEMBER')
              .length,
          )}
        />
      </div>

      <Card padded={false}>
        {list.length === 0 ? (
          <p className="py-12 text-center text-sm text-on-surface-variant">
            Nenhum usuário cadastrado.
          </p>
        ) : (
          <div className="table-wrap border-0">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Nome</th>
                  <th className="table-cell">E-mail</th>
                  <th className="table-cell">Perfil</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {list.map((user) => {
                  const meta = statusMeta.role(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-surface-container-low">
                      <td className="table-cell font-medium">{user.name}</td>
                      <td className="table-cell text-on-surface-variant">{user.email}</td>
                      <td className="table-cell">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="table-cell">
                        <Badge tone={user.isActive ? 'success' : 'neutral'}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo acesso institucional"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} loading={saving} disabled={!name || !email}>
              Enviar convite
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="label" htmlFor="u-name">
              Nome completo *
            </label>
            <input
              id="u-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="u-email">
              E-mail institucional *
            </label>
            <input
              id="u-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="u-role">
              Perfil de acesso *
            </label>
            <select
              id="u-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="input"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {statusMeta.role(r).label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            O destinatário recebe um acesso com a senha padrão e deve trocá-la no primeiro login.
          </p>
        </form>
      </Modal>
    </>
  );
}
