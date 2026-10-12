import { useState } from 'react';
import { Link } from 'react-router-dom';
import { studentsApi } from '../api';
import type { StudentStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { options, statusMeta } from '../lib/labels';
import { formatCurrency, formatNumber } from '../lib/format';

export function StudentsPage() {
  const { institution } = useAuth();
  const institutionId = institution?.id ?? null;
  const [statusFilter, setStatusFilter] = useState<StudentStatus | ''>('');
  const [search, setSearch] = useState('');

  const students = useAsync(
    () => studentsApi.list({ institutionId: institutionId!, status: statusFilter || undefined, take: 300 }),
    [institutionId, statusFilter],
    { enabled: Boolean(institutionId) },
  );

  if (!institutionId) return <PageHeader title="Alunos" />;
  if (students.loading) return <LoadingBlock label="Carregando alunos" />;
  if (students.error) {
    return (
      <>
        <PageHeader title="Alunos" />
        <ErrorBlock message={students.error} onRetry={students.reload} />
      </>
    );
  }

  const list = students.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = term
    ? list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.enrollmentCode.toLowerCase().includes(term) ||
          s.course.toLowerCase().includes(term),
      )
    : list;

  const totalFee = list
    .filter((s) => s.status === 'ACTIVE')
    .reduce((acc, s) => acc + Number(s.monthlyFee), 0);

  return (
    <>
      <PageHeader
        title="Alunos"
        description="Carteira ativa da instituição, com mensalidade e situação de matrícula."
        actions={
          <div className="flex items-end gap-2">
            <Link
              to="/alunos/importar"
              className="rounded border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Importar alunos
            </Link>
            <Link
              to="/alunos/novo"
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-container"
            >
              Adicionar aluno
            </Link>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="font-mono text-xs uppercase text-on-surface-variant">No recorte</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatNumber(list.length)}</p>
        </div>
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="font-mono text-xs uppercase text-on-surface-variant">Ativos</p>
          <p className="mt-1 font-display text-2xl font-semibold text-success">
            {formatNumber(list.filter((s) => s.status === 'ACTIVE').length)}
          </p>
        </div>
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="font-mono text-xs uppercase text-on-surface-variant">Receita mensal</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatCurrency(totalFee)}</p>
        </div>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/60 px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, matrícula ou curso"
            className="input max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StudentStatus | '')}
            className="input w-auto py-1 text-xs"
            aria-label="Filtrar por situação"
          >
            <option value="">Todas as situações</option>
            {options.studentStatus.map((s) => (
              <option key={s} value={s}>
                {statusMeta.student(s).label}
              </option>
            ))}
          </select>
          <span className="ml-auto font-mono text-xs text-on-surface-variant">
            {filtered.length} exibidos
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-on-surface-variant">
            Nenhum aluno encontrado.
          </p>
        ) : (
          <div className="table-wrap border-0">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Matrícula</th>
                  <th className="table-cell">Nome</th>
                  <th className="table-cell">Curso</th>
                  <th className="table-cell">Mensalidade</th>
                  <th className="table-cell">Situação</th>
                  <th className="table-cell">Carteira</th>
                  <th className="table-cell" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => {
                  const meta = statusMeta.student(student.status);
                  return (
                    <tr key={student.id} className="hover:bg-surface-container-low">
                      <td className="table-cell font-mono text-xs">
                        {student.enrollmentCode}
                      </td>
                      <td className="table-cell font-medium">{student.fullName}</td>
                      <td className="table-cell text-on-surface-variant">{student.course}</td>
                      <td className="table-cell font-mono">
                        {formatCurrency(student.monthlyFee)}
                      </td>
                      <td className="table-cell">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {student.walletPub ? `${student.walletPub.slice(0, 8)}…` : '—'}
                      </td>
                      <td className="table-cell text-right">
                        <Link
                          to={`/alunos/${student.id}`}
                          className="text-sm font-medium text-secondary hover:underline"
                        >
                          Perfil
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}