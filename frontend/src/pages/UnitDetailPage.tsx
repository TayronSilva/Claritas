import { Link, useParams } from 'react-router-dom';
import { institutionsApi } from '../api';
import { useAsync } from '../hooks/useAsync';
import { ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';
import { statusMeta } from '../lib/labels';
import { formatCurrency, formatNumber, formatPercent, toNumber } from '../lib/format';

export function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useAsync(() => institutionsApi.detail(id!), [id], { enabled: Boolean(id) });
  const dashboard = useAsync(() => institutionsApi.dashboard(id!), [id], { enabled: Boolean(id) });

  if (detail.loading || dashboard.loading) return <LoadingBlock label="Carregando unidade" />;
  if (detail.error) return <ErrorBlock message={detail.error} onRetry={detail.reload} />;
  if (dashboard.error) return <ErrorBlock message={dashboard.error} onRetry={dashboard.reload} />;

  const unit = detail.data;
  const data = dashboard.data;
  if (!unit || !data) return null;

  const byStatus = (status: string) =>
    data.chargesByStatus.find((c) => c.status === status) ?? { count: 0, amount: '0' };
  const paid = byStatus('PAID');
  const pending = byStatus('PENDING');
  const overdue = byStatus('OVERDUE');
  const totalCharges = data.chargesByStatus.reduce((acc, c) => acc + c.count, 0);
  const totalAmount = data.chargesByStatus.reduce((acc, c) => acc + toNumber(c.amount), 0);
  const meta = statusMeta.institution(unit.status);

  return (
    <>
      <PageHeader
        title={unit.name}
        description={`Slug ${unit.slug} · fundo ${Number(unit.fundSharePct)}%`}
        actions={
          <div className="flex items-end gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Link
              to="/unidades"
              className="rounded border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Voltar
            </Link>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Alunos ativos" value={formatNumber(data.students)} />
        <StatCard label="Cobranças emitidas" value={formatNumber(totalCharges)} />
        <StatCard
          label="Liquidadas"
          value={formatNumber(paid.count)}
          tone="positive"
          hint={
            totalCharges
              ? formatPercent((paid.count / totalCharges) * 100)
              : undefined
          }
        />
        <StatCard label="Inadimplência" value={formatNumber(overdue.count)} tone="negative" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Situação financeira" subtitle="Cobranças por status" />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <dt className="text-on-surface-variant">Liquidadas</dt>
              <dd className="font-mono font-semibold text-success">
                {formatCurrency(paid.amount)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <dt className="text-on-surface-variant">A vencer</dt>
              <dd className="font-mono">{formatCurrency(pending.amount)}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <dt className="text-on-surface-variant">Em atraso</dt>
              <dd className="font-mono text-error">{formatCurrency(overdue.amount)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-on-surface-variant">Total emitido</dt>
              <dd className="font-mono font-semibold">{formatCurrency(totalAmount)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Fundo de permanência" subtitle="Bolsas ativas e orçamento" />
          <div className="mb-4 flex items-center gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-on-surface-variant">Bolsas ativas</p>
              <p className="mt-1 font-display text-2xl font-semibold">{formatNumber(data.activeAwards)}</p>
            </div>
          </div>
          {data.funds.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Nenhum fundo constituído.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Período</th>
                    <th className="table-cell">Orçamento</th>
                    <th className="table-cell">Distribuído</th>
                    <th className="table-cell">Disponível</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funds.map((f) => (
                    <tr key={f.period}>
                      <td className="table-cell font-mono text-xs">{f.period}</td>
                      <td className="table-cell font-mono">{formatCurrency(f.budget)}</td>
                      <td className="table-cell font-mono">{formatCurrency(f.distributed)}</td>
                      <td className="table-cell font-mono">{formatCurrency(f.available)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
