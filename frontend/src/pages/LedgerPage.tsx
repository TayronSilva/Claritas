import { useState } from 'react';
import { ledgerApi } from '../api';
import type { LedgerEntryType } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';
import { options, statusMeta } from '../lib/labels';
import { formatCurrency, formatDateTime, formatNumber } from '../lib/format';

export function LedgerPage() {
  const { institution } = useAuth();
  const institutionId = institution?.id ?? null;
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | ''>('');

  const entries = useAsync(
    () => ledgerApi.entries({ institutionId: institutionId!, type: typeFilter || undefined, take: 300 }),
    [institutionId, typeFilter],
    { enabled: Boolean(institutionId) },
  );
  const balances = useAsync(
    () => ledgerApi.balances(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );
  const impact = useAsync(
    () => ledgerApi.impact(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );

  if (!institutionId) return <PageHeader title="Ledger e impacto" />;
  if (impact.loading) return <LoadingBlock label="Carregando ledger" />;
  if (impact.error) {
    return (
      <>
        <PageHeader title="Ledger e impacto" />
        <ErrorBlock message={impact.error} onRetry={impact.reload} />
      </>
    );
  }

  const impactData = impact.data;
  const list = entries.data ?? [];
  const balanceList = balances.data ?? [];

  return (
    <>
      <PageHeader
        title="Ledger e impacto"
        description="Razão de dupla entrada. A blockchain guarda a prova; a contabilidade operacional fica aqui."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total distribuído"
          value={formatCurrency(impactData?.totalDistributed ?? '0')}
          tone="positive"
        />
        <StatCard
          label="Alunos beneficiados"
          value={formatNumber(impactData?.studentsBenefited ?? 0)}
        />
        <StatCard label="Bolsas ativas" value={formatNumber(impactData?.activeAwards ?? 0)} />
        <StatCard
          label="Lançamentos"
          value={formatNumber(list.length)}
          hint={typeFilter ? 'com filtro aplicado' : 'registros exibidos'}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Distribuição por faixa" />
          {(impactData?.byTier.length ?? 0) === 0 ? (
            <p className="py-4 text-sm text-on-surface-variant">Nenhuma bolsa concedida ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {impactData?.byTier.map((row) => {
                const max = Math.max(
                  ...(impactData?.byTier.map((t) => Number(t.total)) ?? [0]),
                  1,
                );
                const tierMeta = statusMeta.tier(row.tier as 'A' | 'B' | 'C' | 'D');
                return (
                  <div key={row.tier}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge tone={tierMeta.tone}>{tierMeta.label}</Badge>
                      <span className="font-mono text-xs text-on-surface-variant">
                        {formatNumber(row.count)} alunos · {formatCurrency(row.total)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-primary-container"
                        style={{ width: `${(Number(row.total) / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Saldo por conta" />
          {balanceList.length === 0 ? (
            <p className="py-4 text-sm text-on-surface-variant">Nenhum lançamento registrado.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Conta</th>
                    <th className="table-cell">Entradas</th>
                    <th className="table-cell">Saídas</th>
                    <th className="table-cell">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceList.map((row) => (
                    <tr key={row.account}>
                      <td className="table-cell font-mono text-xs">{row.account}</td>
                      <td className="table-cell font-mono text-success">
                        {formatCurrency(row.credit)}
                      </td>
                      <td className="table-cell font-mono text-error">
                        {formatCurrency(row.debit)}
                      </td>
                      <td className="table-cell font-mono font-semibold">
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {impactData && impactData.byCourse.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title="Distribuição por curso"
            subtitle="Onde a economia da cobrança está voltando"
          />
          <div className="flex flex-wrap gap-2">
            {impactData.byCourse.map((row) => (
              <span
                key={row.course}
                className="rounded border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-sm"
              >
                {row.course}: <span className="font-mono text-xs">{formatCurrency(row.total)}</span>{' '}
                <span className="font-mono text-xs text-on-surface-variant">
                  ({formatNumber(row.count)})
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-on-surface-variant">Razão de lançamentos</p>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as LedgerEntryType | '')}
            className="input w-auto py-1 text-xs"
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos os tipos</option>
            {options.ledgerEntryType.map((type) => (
              <option key={type} value={type}>
                {statusMeta.ledgerType(type).label}
              </option>
            ))}
          </select>
        </div>

        {entries.loading && <LoadingBlock label="Carregando lançamentos" />}
        {entries.error && (
          <div className="px-5 pb-5">
            <ErrorBlock message={entries.error} onRetry={entries.reload} />
          </div>
        )}
        {!entries.loading && !entries.error && list.length === 0 && (
          <p className="py-12 text-center text-sm text-on-surface-variant">
            Nenhum lançamento encontrado.
          </p>
        )}
        {list.length > 0 && (
          <div className="table-wrap border-0 border-t border-outline-variant/60">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Data</th>
                  <th className="table-cell">Tipo</th>
                  <th className="table-cell">Conta</th>
                  <th className="table-cell">Descrição</th>
                  <th className="table-cell">Direção</th>
                  <th className="table-cell">Valor</th>
                  <th className="table-cell">Ancoragem</th>
                </tr>
              </thead>
              <tbody>
                {list.map((entry) => {
                  const typeMeta = statusMeta.ledgerType(entry.type);
                  const dirMeta = statusMeta.direction(entry.direction);
                  return (
                    <tr key={entry.id} className="hover:bg-surface-container-low">
                      <td className="table-cell font-mono text-xs">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="table-cell">
                        <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>
                      </td>
                      <td className="table-cell font-mono text-xs">{entry.account}</td>
                      <td className="table-cell text-on-surface-variant">
                        {entry.memo ?? '—'}
                      </td>
                      <td className="table-cell">
                        <Badge tone={dirMeta.tone}>{dirMeta.label}</Badge>
                      </td>
                      <td
                        className={`table-cell font-mono ${
                          entry.direction === 'CREDIT' ? 'text-success' : 'text-error'
                        }`}
                      >
                        {entry.direction === 'CREDIT' ? '+' : '−'}
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {entry.onchainRef ? `${entry.onchainRef.slice(0, 12)}…` : '—'}
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