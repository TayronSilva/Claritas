import { useState } from 'react';
import { fundApi } from '../api';
import type { EconomyPreview } from '../api/types';
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
  formatNumber,
  formatPeriod,
  toNumber,
} from '../lib/format';
import { ApiError } from '../api/client';

type CostInputs = {
  bankFeePerLiquidation: number;
  newVariableCostPerPayment: number;
  platformFeePerStudent: number;
  platformFeePerLiquidation: number;
};

const DEFAULT_INPUTS: CostInputs = {
  bankFeePerLiquidation: 7,
  newVariableCostPerPayment: 0.3,
  platformFeePerStudent: 0.8,
  platformFeePerLiquidation: 1.2,
};

export function FundPage() {
  const { institution } = useAuth();
  const institutionId = institution?.id ?? null;

  const [period, setPeriod] = useState(currentPeriod());
  const [inputs, setInputs] = useState<CostInputs>(DEFAULT_INPUTS);
  const [preview, setPreview] = useState<EconomyPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const stats = useAsync(
    () => fundApi.stats(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );
  const funds = useAsync(
    () => fundApi.list(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );

  async function handlePreview() {
    if (!institutionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fundApi.previewEconomy({ institutionId, period, ...inputs });
      setPreview(result);
      setNotice(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao calcular a economia');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!institutionId) return;
    setBusy(true);
    setError(null);
    try {
      await fundApi.saveEconomy({ institutionId, period, ...inputs });
      const fund = await fundApi.create(institutionId, period);
      setNotice(`Relatório salvo e fundo ${formatPeriod(fund.period)} criado com orçamento de ${formatCurrency(fund.budget)}.`);
      setPreview(null);
      stats.reload();
      funds.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar o relatório');
    } finally {
      setBusy(false);
    }
  }

  if (!institutionId) return <PageHeader title="Fundo de permanência" />;
  if (stats.loading || funds.loading) return <LoadingBlock label="Carregando fundo" />;
  if (stats.error) {
    return (
      <>
        <PageHeader title="Fundo de permanência" />
        <ErrorBlock message={stats.error} onRetry={stats.reload} />
      </>
    );
  }

  const totals = stats.data?.totals;
  const list = funds.data ?? [];

  return (
    <>
      <PageHeader
        title="Fundo de permanência"
        description="A economia líquida da cobrança, convertida em auxílio estudantil com regra publicada."
      />

      {notice && (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orçamento acumulado" value={formatCurrency(totals?.budget ?? '0')} />
        <StatCard label="Distribuído" value={formatCurrency(totals?.distributed ?? '0')} />
        <StatCard label="Reservado" value={formatCurrency(totals?.reserved ?? '0')} />
        <StatCard
          label="Disponível"
          value={formatCurrency(totals?.available ?? '0')}
          tone="positive"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Simular economia do período"
            subtitle="A partir da carteira ativa e dos custos informados."
          />

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="fund-period">
                Período
              </label>
              <input
                id="fund-period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label" htmlFor="bank-fee">
                Tarifa bancária por liquidação (R$)
              </label>
              <input
                id="bank-fee"
                type="number"
                step="0.01"
                min="0"
                value={inputs.bankFeePerLiquidation}
                onChange={(e) =>
                  setInputs((prev) => ({
                    ...prev,
                    bankFeePerLiquidation: Number(e.target.value),
                  }))
                }
                className="input font-mono"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                Referência pública: R$ 2,48 (contrato UEL/CAIXA) a R$ 11,00 (Bradesco
                escritural). Use o valor do convênio da instituição.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="var-cost">
                  Custo variável (R$)
                </label>
                <input
                  id="var-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputs.newVariableCostPerPayment}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      newVariableCostPerPayment: Number(e.target.value),
                    }))
                  }
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="label" htmlFor="fee-student">
                  Taxa por aluno (R$)
                </label>
                <input
                  id="fee-student"
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputs.platformFeePerStudent}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      platformFeePerStudent: Number(e.target.value),
                    }))
                  }
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="label" htmlFor="fee-liq">
                  Taxa por liquidação (R$)
                </label>
                <input
                  id="fee-liq"
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputs.platformFeePerLiquidation}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      platformFeePerLiquidation: Number(e.target.value),
                    }))
                  }
                  className="input font-mono"
                />
              </div>
            </div>

            <Button onClick={handlePreview} loading={busy} className="w-full">
              Calcular economia
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-3">
          {preview ? (
            <Card>
              <CardHeader
                title="Resultado da simulação"
                subtitle={`${formatNumber(preview.activeStudents)} alunos ativos · ${formatNumber(preview.expectedLiquidation)} liquidações esperadas`}
                action={
                  <Button variant="ghost" onClick={() => setPreview(null)}>
                    Limpar
                  </Button>
                }
              />

              <div className="space-y-3">
                <Row label="Custo bancário atual" value={formatCurrency(preview.bankCostCurrent)} />
                <Row label="Novo custo variável" value={`− ${formatCurrency(preview.newVariableCost)}`} />
                <Row label="Taxa da plataforma" value={`− ${formatCurrency(preview.platformFee)}`} />
                <div className="border-t border-outline-variant/60 pt-3">
                  <Row
                    label="Economia líquida"
                    value={formatCurrency(preview.netEconomy)}
                    strong
                    tone="positive"
                  />
                </div>
                <Row
                  label={`Repasse ao fundo (${preview.fundSharePct}%)`}
                  value={formatCurrency(preview.fundAmount)}
                  strong
                  tone="accent"
                />
                <Row
                  label="Benefício residual da instituição"
                  value={formatCurrency(preview.institutionBenefit)}
                />
              </div>

              <div className="mt-4 space-y-3">
                <Alert tone="warning">{preview.disclaimer}</Alert>
                {error && <Alert tone="error">{error}</Alert>}
                <Button onClick={handleSave} loading={busy} className="w-full">
                  Salvar relatório e criar fundo
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Fundos criados" subtitle="Um fundo por período de referência" />
              {error && (
                <div className="mb-4">
                  <Alert tone="error">{error}</Alert>
                </div>
              )}
              {list.length === 0 ? (
                <p className="py-8 text-center text-sm text-on-surface-variant">
                  Calcule a economia de um período para criar o primeiro fundo.
                </p>
              ) : (
                <div className="space-y-3">
                  {list.map((fund) => {
                    const available = toNumber(fund.budget) - toNumber(fund.distributed) - toNumber(fund.reserved);
                    return (
                      <div
                        key={fund.id}
                        className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display font-semibold">
                              Fundo {formatPeriod(fund.period)}
                            </p>
                            <p className="font-mono text-xs text-on-surface-variant">
                              {fund._count.awards} bolsa{fund._count.awards === 1 ? '' : 's'} concedida
                              {fund._count.awards === 1 ? '' : 's'}
                            </p>
                          </div>
                          <button
                            onClick={() => setDetailId(fund.id)}
                            className="text-sm font-medium text-secondary hover:underline"
                          >
                            Detalhe
                          </button>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                          <Stat label="Orçamento" value={formatCurrency(fund.budget)} />
                          <Stat label="Distribuído" value={formatCurrency(fund.distributed)} />
                          <Stat label="Reservado" value={formatCurrency(fund.reserved)} />
                          <Stat label="Disponível" value={formatCurrency(available)} />
                        </dl>
                        {fund.economyReport && (
                          <p className="mt-3 border-t border-outline-variant/40 pt-2 text-xs text-on-surface-variant">
                            Economia líquida de referência:{' '}
                            {formatCurrency(fund.economyReport.netEconomy)} ·{' '}
                            {fund.economyReport.fundSharePct}% destinado ao fundo
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <FundDetailModal fundId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}

function Row({
  label,
  value,
  strong = false,
  tone = 'default',
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'default' | 'positive' | 'accent';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-success'
      : tone === 'accent'
        ? 'text-primary'
        : 'text-on-surface';
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={`font-mono ${strong ? 'text-base font-semibold' : ''} ${toneClass}`}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase text-on-surface-variant">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}

function FundDetailModal({ fundId, onClose }: { fundId: string | null; onClose: () => void }) {
  const detail = useAsync(
    () => fundApi.detail(fundId!),
    [fundId],
    { enabled: Boolean(fundId) },
  );

  return (
    <Modal open={Boolean(fundId)} onClose={onClose} title="Detalhe do fundo" wide>
      {detail.loading && <LoadingBlock label="Carregando fundo" />}
      {detail.error && <Alert tone="error">{detail.error}</Alert>}
      {detail.data && (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={`Fundo ${formatPeriod(detail.data.period)}`}
              subtitle={`${detail.data.awards.length} bolsas concedidas`}
            />
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              <Stat label="Orçamento" value={formatCurrency(detail.data.budget)} />
              <Stat label="Distribuído" value={formatCurrency(detail.data.distributed)} />
              <Stat label="Reservado" value={formatCurrency(detail.data.reserved)} />
              <Stat label="Contribuído" value={formatCurrency(detail.data.contributed)} />
            </dl>
          </Card>

          {detail.data.economyReport && (
            <Card>
              <CardHeader title="Memória de cálculo" subtitle="Como a economia líquida foi obtida" />
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Stat label="Alunos ativos" value={formatNumber(detail.data.economyReport.activeStudents)} />
                <Stat
                  label="Liquidações esperadas"
                  value={formatNumber(detail.data.economyReport.expectedLiquidation)}
                />
                <Stat
                  label="Tarifa bancária"
                  value={formatCurrency(detail.data.economyReport.bankFeePerLiquidation)}
                />
                <Stat label="Custo bancário total" value={formatCurrency(detail.data.economyReport.bankCostCurrent)} />
                <Stat label="Economia líquida" value={formatCurrency(detail.data.economyReport.netEconomy)} />
                <Stat label="Percentual ao fundo" value={`${detail.data.economyReport.fundSharePct}%`} />
              </dl>
            </Card>
          )}

          {detail.data.awards.length > 0 && (
            <Card>
              <CardHeader title="Bolsas concedidas" />
              <div className="table-wrap">
                <table>
                  <thead className="table-head">
                    <tr>
                      <th className="table-cell">Aluno</th>
                      <th className="table-cell">Curso</th>
                      <th className="table-cell">Faixa</th>
                      <th className="table-cell">Cobertura</th>
                      <th className="table-cell">Valor mensal</th>
                      <th className="table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.awards.map((award) => {
                      const meta = statusMeta.award(award.status);
                      return (
                        <tr key={award.id}>
                          <td className="table-cell">{award.student?.fullName ?? '—'}</td>
                          <td className="table-cell text-on-surface-variant">
                            {award.student?.course ?? '—'}
                          </td>
                          <td className="table-cell">
                            <Badge tone={statusMeta.tier(award.tier).tone}>
                              {statusMeta.tier(award.tier).label}
                            </Badge>
                          </td>
                          <td className="table-cell font-mono">{award.coveragePct}%</td>
                          <td className="table-cell font-mono">
                            {formatCurrency(award.monthlyValue)}
                          </td>
                          <td className="table-cell">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );
}