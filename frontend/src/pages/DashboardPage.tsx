import { Link } from 'react-router-dom';
import { institutionsApi, solanaApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { statusMeta } from '../lib/labels';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPeriod } from '../lib/format';

export function DashboardPage() {
  const { institution } = useAuth();
  const id = institution?.id ?? null;

  const dashboard = useAsync(
    () => institutionsApi.dashboard(id!),
    [id],
    { enabled: Boolean(id) },
  );
  const solana = useAsync(() => solanaApi.status(), []);

  if (!institution) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <Alert tone="warning">Nenhuma instituição vinculada a este usuário.</Alert>
      </>
    );
  }

  if (dashboard.loading) return <LoadingBlock label="Carregando painel" />;
  if (dashboard.error || !dashboard.data) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <ErrorBlock message={dashboard.error ?? 'Sem dados'} onRetry={dashboard.reload} />
      </>
    );
  }

  const data = dashboard.data;
  const economy = data.latestEconomy;
  const pending = data.chargesByStatus.find((c) => c.status === 'PENDING');
  const paid = data.chargesByStatus.find((c) => c.status === 'PAID');
  const overdue = data.chargesByStatus.find((c) => c.status === 'OVERDUE');
  const totalBilled = data.chargesByStatus.reduce((sum, c) => sum + Number(c.amount), 0);
  const status = solana.data;

  return (
    <>
      <PageHeader
        title={data.institution.name}
        description="Arrecadação do período, economia líquida e estado do fundo de permanência."
        actions={
          <Link
            to="/cobrancas"
            className="rounded border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
          >
            Ver cobranças
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={formatNumber(data.students)}
          hint={`${statusMeta.institution(data.institution.status).label} · fundo ${data.institution.fundSharePct}%`}
        />
        <StatCard
          label="Arrecadado no período"
          value={formatCurrencyCompact(paid?.amount ?? '0')}
          hint={paid ? `${formatNumber(paid.count)} cobranças pagas` : 'nenhuma cobrança paga'}
        />
        <StatCard
          label="A receber"
          value={formatCurrencyCompact(pending?.amount ?? '0')}
          hint={pending ? `${formatNumber(pending.count)} cobranças pendentes` : '—'}
        />
        <StatCard
          label="Economia líquida"
          value={economy ? formatCurrencyCompact(economy.netEconomy) : '—'}
          hint={economy ? `Período ${formatPeriod(economy.period)}` : 'sem relatório gerado'}
          tone={economy ? 'positive' : 'default'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Cobranças por status"
              subtitle={`Total emitido ${formatCurrency(totalBilled)}`}
            />
            <div className="space-y-2.5">
              {data.chargesByStatus.map((row) => {
                const meta = statusMeta.charge(row.status);
                const pct = totalBilled > 0 ? (Number(row.amount) / totalBilled) * 100 : 0;
                return (
                  <div key={row.status}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="font-mono text-xs text-on-surface-variant">
                          {formatNumber(row.count)} cobranças
                        </span>
                      </div>
                      <span className="font-mono text-sm text-on-surface">
                        {formatCurrency(row.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Fundos por período"
              subtitle="Orçamento, repasse e saldo disponível"
              action={
                <Link
                  to="/fundo"
                  className="text-sm font-medium text-secondary hover:underline"
                >
                  gerenciar
                </Link>
              }
            />
            {data.funds.length === 0 ? (
              <p className="py-6 text-center text-sm text-on-surface-variant">
                Nenhum fundo criado ainda.
              </p>
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
                    {data.funds.map((fund) => (
                      <tr key={fund.period}>
                        <td className="table-cell font-mono">{formatPeriod(fund.period)}</td>
                        <td className="table-cell">{formatCurrency(fund.budget)}</td>
                        <td className="table-cell">{formatCurrency(fund.distributed)}</td>
                        <td className="table-cell font-medium">
                          {formatCurrency(fund.available)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {economy && (
            <Card>
              <CardHeader title="Economia do período" subtitle={formatPeriod(economy.period)} />
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Custo bancário atual</dt>
                  <dd className="font-mono">{formatCurrency(economy.bankCostCurrent)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Economia líquida</dt>
                  <dd className="font-mono font-medium text-success">
                    {formatCurrency(economy.netEconomy)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">
                    Repasse ao fundo ({economy.fundSharePct}%)
                  </dt>
                  <dd className="font-mono font-medium text-primary">
                    {formatCurrency(economy.fundAmount)}
                  </dd>
                </div>
              </dl>
              {!economy.isVerified && (
                <div className="mt-4">
                  <Alert tone="warning">
                    Premissa de planejamento. Substituir pelo convênio bancário real da instituição
                    antes de apresentar como fato.
                  </Alert>
                </div>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Bolsas ativas" subtitle="Beneficiários em vigência" />
            <p className="font-display text-3xl font-semibold text-primary">
              {formatNumber(data.activeAwards)}
            </p>
            {overdue && Number(overdue.count) > 0 && (
              <div className="mt-4">
                <Alert tone="error">
                  {formatNumber(overdue.count)} cobranças vencidas exigem ação da tesouraria.
                </Alert>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Camada de auditoria" subtitle="Estado da conexão Solana" />
            {solana.loading ? (
              <p className="text-sm text-on-surface-variant">Consultando…</p>
            ) : status ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Rede</dt>
                  <dd className="font-mono">{status.network}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Fee payer</dt>
                  <dd className="font-mono">
                    {status.pubkey ? `${status.pubkey.slice(0, 8)}…` : 'não configurado'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Situação</dt>
                  <dd>
                    <Badge tone={status.ready ? 'success' : 'warning'}>
                      {status.ready ? 'Operacional' : 'Modo simulado'}
                    </Badge>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-on-surface-variant">Indisponível</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}