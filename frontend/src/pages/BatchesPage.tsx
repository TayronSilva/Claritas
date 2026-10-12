import { useState } from 'react';
import { batchesApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';
import { Modal } from '../components/Modal';
import { statusMeta } from '../lib/labels';
import {
  currentPeriod,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPeriod,
  truncate,
} from '../lib/format';
import { ApiError } from '../api/client';
import type { BatchSettleResult } from '../api/types';

export function BatchesPage() {
  const { institution } = useAuth();
  const institutionId = institution?.id ?? null;

  const [period, setPeriod] = useState(currentPeriod());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BatchSettleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const batches = useAsync(
    () => batchesApi.list(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );

  async function handleSettle() {
    if (!institutionId) return;
    setBusy(true);
    setError(null);
    try {
      const settled = await batchesApi.settle(institutionId, period);
      setResult(settled);
      batches.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao liquidar o lote');
    } finally {
      setBusy(false);
    }
  }

  if (!institutionId) return <PageHeader title="Lotes" />;
  if (batches.loading) return <LoadingBlock label="Carregando lotes" />;
  if (batches.error) {
    return (
      <>
        <PageHeader title="Lotes" />
        <ErrorBlock message={batches.error} onRetry={batches.reload} />
      </>
    );
  }

  const list = batches.data ?? [];
  const confirmed = list.filter((b) => b.status === 'CONFIRMED');
  const totalSettled = confirmed.reduce((acc, b) => acc + Number(b.totalAmount), 0);

  return (
    <>
      <PageHeader
        title="Lotes de liquidação"
        description="Consolida as cobranças do período e executa o split na mesma transação."
        actions={
          <div className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="batch-period">
                Período
              </label>
              <input
                id="batch-period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>
            <Button onClick={handleSettle} loading={busy}>
              Liquidar período
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {result && (
        <div className="mb-5">
          <Alert tone={result.simulated ? 'warning' : 'success'} title="Lote processado">
            <p>
              {formatNumber(result.chargeCount)} cobranças · {formatCurrency(result.totalAmount)}
            </p>
            <p className="mt-1 font-mono text-xs">{result.note}</p>
            {result.lookupTable && (
              <p className="mt-1 font-mono text-xs">
                tabela de endereços: {truncate(result.lookupTable, 24)}
              </p>
            )}
          </Alert>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Lotes criados" value={formatNumber(list.length)} />
        <StatCard
          label="Lotes confirmados"
          value={formatNumber(confirmed.length)}
          tone="positive"
        />
        <StatCard
          label="Total liquidado"
          value={formatCurrency(totalSettled)}
          hint="Soma dos lotes confirmados"
        />
      </div>

      <Card padded={false}>
        <div className="border-b border-outline-variant/60 px-4 py-3">
          <p className="text-sm text-on-surface-variant">
            Um lote é a unidade de execução on-chain. Todos os pagamentos que o compõem são
            resolvidos na mesma transação, com o split entre universidade, plataforma e fundo.
          </p>
        </div>

        {list.length === 0 ? (
          <p className="py-12 text-center text-sm text-on-surface-variant">
            Nenhum lote ainda. Gere a mensalidade e liquide um período para começar.
          </p>
        ) : (
          <div className="table-wrap border-0">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Lote</th>
                  <th className="table-cell">Período</th>
                  <th className="table-cell">Cobranças</th>
                  <th className="table-cell">Total</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Transação</th>
                  <th className="table-cell">Confirmado em</th>
                  <th className="table-cell" />
                </tr>
              </thead>
              <tbody>
                {list.map((batch) => {
                  const meta = statusMeta.batch(batch.status);
                  return (
                    <tr key={batch.id} className="hover:bg-surface-container-low">
                      <td className="table-cell font-medium">{batch.label}</td>
                      <td className="table-cell font-mono text-xs">
                        {formatPeriod(batch.period)}
                      </td>
                      <td className="table-cell font-mono">
                        {formatNumber(batch.chargeCount)}
                      </td>
                      <td className="table-cell font-mono">
                        {formatCurrency(batch.totalAmount)}
                      </td>
                      <td className="table-cell">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {batch.txSignature ? truncate(batch.txSignature, 10) : '—'}
                      </td>
                      <td className="table-cell font-mono text-xs">
                        {formatDateTime(batch.confirmedAt)}
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => setDetailId(batch.id)}
                          className="text-sm font-medium text-secondary hover:underline"
                        >
                          Detalhe
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <BatchDetailModal batchId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}

function BatchDetailModal({ batchId, onClose }: { batchId: string | null; onClose: () => void }) {
  const detail = useAsync(
    () => batchesApi.detail(batchId!),
    [batchId],
    { enabled: Boolean(batchId) },
  );

  return (
    <Modal
      open={Boolean(batchId)}
      onClose={onClose}
      title="Detalhe do lote"
      wide
    >
      {detail.loading && <LoadingBlock label="Carregando lote" />}
      {detail.error && <Alert tone="error">{detail.error}</Alert>}
      {detail.data && (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Resumo" subtitle={detail.data.label} />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-on-surface-variant">Período</dt>
                <dd className="font-mono">{formatPeriod(detail.data.period)}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-on-surface-variant">Cobranças</dt>
                <dd className="font-mono">{formatNumber(detail.data.chargeCount)}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-on-surface-variant">Total</dt>
                <dd className="font-mono">{formatCurrency(detail.data.totalAmount)}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-on-surface-variant">Transação</dt>
                <dd className="break-all font-mono text-xs">
                  {detail.data.txSignature ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-on-surface-variant">Tabela de endereços</dt>
                <dd className="break-all font-mono text-xs">
                  {detail.data.lookupTable ?? '—'}
                </dd>
              </div>
            </dl>
          </Card>

          {detail.data.ledger.length > 0 && (
            <Card>
              <CardHeader title="Lançamentos do lote" />
              <div className="space-y-2">
                {detail.data.ledger.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 border-b border-outline-variant/40 py-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm">{entry.memo ?? entry.type}</p>
                      <p className="font-mono text-xs text-on-surface-variant">{entry.account}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {entry.direction === 'CREDIT' ? '+' : '−'}
                        {formatCurrency(entry.amount)}
                      </p>
                      <p className="font-mono text-[10px] uppercase text-on-surface-variant">
                        {entry.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Cobranças incluídas"
              subtitle={`${detail.data.charges.length} registros`}
            />
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Aluno</th>
                    <th className="table-cell">Matrícula</th>
                    <th className="table-cell">Valor</th>
                    <th className="table-cell">Status</th>
                    <th className="table-cell">Ancoragem</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.charges.map((charge) => {
                    const meta = statusMeta.charge(charge.status);
                    return (
                      <tr key={charge.id}>
                        <td className="table-cell">{charge.student.fullName}</td>
                        <td className="table-cell font-mono text-xs">
                          {charge.student.enrollmentCode}
                        </td>
                        <td className="table-cell font-mono">
                          {formatCurrency(charge.amount)}
                        </td>
                        <td className="table-cell">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className="table-cell font-mono text-xs text-on-surface-variant">
                          {charge.onchainRef ? truncate(charge.onchainRef, 12) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
}