import { Link } from 'react-router-dom';
import { institutionsApi } from '../api';
import { useAsync } from '../hooks/useAsync';
import { ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { statusMeta } from '../lib/labels';
import { formatNumber, formatPercent } from '../lib/format';

export function UnitsPage() {
  const units = useAsync(() => institutionsApi.list(), []);

  if (units.loading) return <LoadingBlock label="Carregando unidades" />;
  if (units.error) return <ErrorBlock message={units.error} onRetry={units.reload} />;
  const list = units.data ?? [];

  const totalStudents = list.reduce((acc, u) => acc + (u._count?.students ?? 0), 0);
  const active = list.filter((u) => u.status === 'ACTIVE').length;

  return (
    <>
      <PageHeader
        title="Polos & Unidades"
        description="Unidades da instituição, com matrículas ativas e status operacional."
        actions={
          <Link
            to="/unidades/nova"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-container"
          >
            Adicionar unidade
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total de unidades" value={formatNumber(list.length)} />
        <StatCard label="Matrículas ativas" value={formatNumber(totalStudents)} />
        <StatCard
          label="Unidades operacionais"
          value={list.length ? formatPercent((active / list.length) * 100, 0) : '—'}
          tone="positive"
        />
      </div>

      <Card padded={false}>
        {list.length === 0 ? (
          <p className="py-12 text-center text-sm text-on-surface-variant">
            Nenhuma unidade cadastrada.
          </p>
        ) : (
          <div className="table-wrap border-0">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Unidade</th>
                  <th className="table-cell">Slug</th>
                  <th className="table-cell">Alunos</th>
                  <th className="table-cell">Fundo (%)</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell" />
                </tr>
              </thead>
              <tbody>
                {list.map((unit) => {
                  const meta = statusMeta.institution(unit.status);
                  return (
                    <tr key={unit.id} className="hover:bg-surface-container-low">
                      <td className="table-cell font-medium">{unit.name}</td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {unit.slug}
                      </td>
                      <td className="table-cell font-mono">
                        {formatNumber(unit._count?.students ?? 0)}
                      </td>
                      <td className="table-cell font-mono">{Number(unit.fundSharePct)}%</td>
                      <td className="table-cell">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="table-cell text-right">
                        <Link
                          to={`/unidades/${unit.id}`}
                          className="text-sm font-medium text-secondary hover:underline"
                        >
                          Abrir
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
