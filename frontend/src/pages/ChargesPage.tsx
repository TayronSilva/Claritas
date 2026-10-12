import { useMemo, useState } from 'react';
import { chargesApi } from '../api';
import type { Charge, ChargeStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, PageHeader } from '../components/Layout';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { options, statusMeta } from '../lib/labels';
import { currentPeriod, formatCurrency, formatDate, formatPeriod, truncate } from '../lib/format';
import { ApiError } from '../api/client';

export function ChargesPage() {
  const { institution } = useAuth();
  const institutionId = institution?.id ?? null;

  const [statusFilter, setStatusFilter] = useState<ChargeStatus | ''>('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [period, setPeriod] = useState(currentPeriod());
  const [linkTarget, setLinkTarget] = useState<Charge | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charges = useAsync(
    () => chargesApi.list({ institutionId: institutionId!, status: statusFilter || undefined, take: 200 }),
    [institutionId, statusFilter],
    { enabled: Boolean(institutionId) },
  );

  const totals = useMemo(() => {
    const list = charges.data ?? [];
    const sum = (predicate: (c: Charge) => boolean) =>
      list.filter(predicate).reduce((acc, c) => acc + Number(c.amount), 0);
    return {
      count: list.length,
      pending: sum((c) => c.status === 'PENDING'),
      paid: sum((c) => c.status === 'PAID'),
      overdue: sum((c) => c.status === 'OVERDUE'),
    };
  }, [charges.data]);

  async function handleGenerate() {
    if (!institutionId) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await chargesApi.generate(institutionId, period);
      setNotice(
        `Período ${formatPeriod(result.period)}: ${result.created} cobranças criadas, ${result.skipped} já existentes de ${result.total} alunos ativos.`,
      );
      setGenerateOpen(false);
      charges.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Falha ao gerar cobranças');
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkOverdue() {
    if (!institutionId) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await chargesApi.markOverdue(institutionId);
      setNotice(`${result.updated} cobranças marcadas como vencidas.`);
      charges.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Falha ao marcar vencidas');
    } finally {
      setBusy(false);
    }
  }

  if (!institutionId) return <PageHeader title="Cobranças" />;
  if (charges.loading) return <LoadingBlock label="Carregando cobranças" />;
  if (charges.error) {
    return (
      <>
        <PageHeader title="Cobranças" />
        <ErrorBlock message={charges.error} onRetry={charges.reload} />
      </>
    );
  }

  const list = charges.data ?? [];

  return (
    <>
      <PageHeader
        title="Cobranças"
        description="Emissão mensal, acompanhamento de inadimplência e link de pagamento por cobrança."
        actions={
          <>
            <Button variant="ghost" onClick={handleMarkOverdue} loading={busy}>
              Marcar vencidas
            </Button>
            <Button onClick={() => setGenerateOpen(true)}>Gerar mensalidade</Button>
          </>
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      {actionError && (
        <div className="mb-4">
          <Alert tone="error">{actionError}</Alert>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="font-mono text-xs uppercase text-on-surface-variant">No recorte</p>
          <p className="mt-1 font-display text-2xl font-semibold">{totals.count}</p>
        </div>
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="font-mono text-xs uppercase text-on-surface-variant">Pendente</p>
          <p className="mt-1 font-display text-2xl font-semibold text-tertiary-on-container">
            {formatCurrency(totals.pending)}
          </p>
        </div>
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="font-mono text-xs uppercase text-on-surface-variant">Pago</p>
          <p className="mt-1 font-display text-2xl font-semibold text-success">
            {formatCurrency(totals.paid)}
          </p>
        </div>
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <p className="font-mono text-xs uppercase text-on-surface-variant">Vencido</p>
          <p className="mt-1 font-display text-2xl font-semibold text-error">
            {formatCurrency(totals.overdue)}
          </p>
        </div>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 px-4 py-3">
          <p className="text-sm text-on-surface-variant">
            Exibindo {list.length} cobrança{list.length === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ChargeStatus | '')}
              className="input w-auto py-1 text-xs"
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              {options.chargeStatus.map((s) => (
                <option key={s} value={s}>
                  {statusMeta.charge(s).label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="py-12 text-center text-sm text-on-surface-variant">
            Nenhuma cobrança encontrada. Use “Gerar mensalidade” para emitir o período.
          </p>
        ) : (
          <div className="table-wrap border-0">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Referência</th>
                  <th className="table-cell">Aluno</th>
                  <th className="table-cell">Vencimento</th>
                  <th className="table-cell">Valor</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Transação</th>
                  <th className="table-cell" />
                </tr>
              </thead>
              <tbody>
                {list.map((charge) => {
                  const meta = statusMeta.charge(charge.status);
                  return (
                    <tr key={charge.id} className="hover:bg-surface-container-low">
                      <td className="table-cell font-mono text-xs">
                        {truncate(charge.reference, 18)}
                      </td>
                      <td className="table-cell">
                        <p className="font-medium">{charge.student.fullName}</p>
                        <p className="font-mono text-xs text-on-surface-variant">
                          {charge.student.enrollmentCode}
                        </p>
                      </td>
                      <td className="table-cell font-mono text-xs">
                        {formatDate(charge.dueDate)}
                      </td>
                      <td className="table-cell font-mono">{formatCurrency(charge.amount)}</td>
                      <td className="table-cell">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {charge.payment?.txSignature
                          ? truncate(charge.payment.txSignature, 10)
                          : '—'}
                      </td>
                      <td className="table-cell text-right">
                        {charge.status !== 'PAID' && (
                          <button
                            onClick={() => setLinkTarget(charge)}
                            className="text-sm font-medium text-secondary hover:underline"
                          >
                            Link
                          </button>
                        )}
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
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Gerar mensalidade do período"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGenerateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} loading={busy}>
              Emitir cobranças
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-on-surface-variant">
          Cria uma cobrança para cada aluno ativo da instituição, com vencimento no dia 10 do mês
          de referência. Cobranças já existentes no mesmo período são preservadas.
        </p>
        <label className="label" htmlFor="period">
          Período de referência
        </label>
        <input
          id="period"
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input"
        />
      </Modal>

      <PaymentLinkModal charge={linkTarget} onClose={() => setLinkTarget(null)} />
    </>
  );
}

function PaymentLinkModal({ charge, onClose }: { charge: Charge | null; onClose: () => void }) {
  const { data, loading, error } = useAsync(
    () => chargesApi.paymentLink(charge!.id),
    [charge?.id],
    { enabled: Boolean(charge) },
  );

  return (
    <Modal open={Boolean(charge)} onClose={onClose} title="Link de pagamento">
      {loading && <LoadingBlock label="Gerando link" />}
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <div className="space-y-3">
          <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
              Payload do QR
            </p>
            <p className="mt-2 break-all font-mono text-sm text-primary">{data.qrPayload}</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Aluno</dt>
              <dd>{data.student.fullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Referência</dt>
              <dd className="font-mono text-xs">{data.reference}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Valor</dt>
              <dd className="font-mono">{formatCurrency(data.amount)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Rede</dt>
              <dd className="font-mono">{data.network}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Taxa para o aluno</dt>
              <dd>
                <Badge tone={data.feeSponsored ? 'success' : 'warning'}>
                  {data.feeSponsored ? 'Patrocinada' : 'Cobrada do aluno'}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Modal>
  );
}