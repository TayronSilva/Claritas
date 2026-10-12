import { useState } from 'react';
import { fundApi, scholarshipsApi } from '../api';
import type { AllocateResult, EvaluateResult } from '../api/types';
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
import type { CriterionScore } from '../api/types';

export function ScholarshipsPage() {
  const { institution } = useAuth();
  const institutionId = institution?.id ?? null;

  const [period, setPeriod] = useState(currentPeriod());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<AllocateResult | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluateResult | null>(null);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<string>('');

  const rule = useAsync(
    () => scholarshipsApi.rule(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );
  const ranking = useAsync(
    () => scholarshipsApi.ranking(institutionId!, period),
    [institutionId, period],
    { enabled: Boolean(institutionId) },
  );
  const funds = useAsync(
    () => fundApi.list(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );

  async function handleEvaluate() {
    if (!institutionId) return;
    setBusy(true);
    setError(null);
    setAllocation(null);
    try {
      const result = await scholarshipsApi.evaluate(institutionId, period);
      setEvaluation(result);
      ranking.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha na avaliação');
    } finally {
      setBusy(false);
    }
  }

  async function handleAllocate() {
    if (!institutionId || !selectedFund) return;
    setBusy(true);
    setError(null);
    try {
      const result = await scholarshipsApi.allocate(institutionId, period, selectedFund);
      setAllocation(result);
      setAllocateOpen(false);
      ranking.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha na alocação');
    } finally {
      setBusy(false);
    }
  }

  if (!institutionId) return <PageHeader title="Bolsas" />;
  if (rule.loading) return <LoadingBlock label="Carregando regra" />;
  if (rule.error) {
    return (
      <>
        <PageHeader title="Bolsas" />
        <ErrorBlock message={rule.error} onRetry={rule.reload} />
      </>
    );
  }

  const list = ranking.data ?? [];
  const eligible = list.filter((r) => r.eligibility === 'PASS');
  const budget = funds.data?.find((f) => f.period === period);
  const fundOptions = (funds.data ?? []).filter((f) => toNumber(f.budget) > 0);

  return (
    <>
      <PageHeader
        title="Bolsas de permanência"
        description="Pontuação pública por critério, ordenação por necessidade e concessão dentro do orçamento do fundo."
        actions={
          <div className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="sch-period">
                Período
              </label>
              <input
                id="sch-period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>
            <Button variant="ghost" onClick={handleEvaluate} loading={busy}>
              Avaliar carteira
            </Button>
            <Button
              onClick={() => {
                setSelectedFund(budget?.id ?? fundOptions[0]?.id ?? '');
                setAllocateOpen(true);
              }}
              disabled={fundOptions.length === 0}
            >
              Conceder bolsas
            </Button>
          </div>
        }
      />

      {evaluation && (
        <div className="mb-4">
          <Alert tone="success">
            Avaliação concluída com a regra versão {evaluation.ruleVersion}: {evaluation.eligible}{' '}
            elegíveis e {evaluation.ineligible} inelegíveis em {evaluation.total} alunos ativos.
          </Alert>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {fundOptions.length === 0 && (
        <div className="mb-4">
          <Alert tone="warning">
            Nenhum fundo com orçamento para o período. Calcule a economia e crie o fundo primeiro.
          </Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Candidatos no ranking" value={formatNumber(list.length)} />
        <StatCard label="Elegíveis" value={formatNumber(eligible.length)} tone="positive" />
        <StatCard
          label="Orçamento do período"
          value={budget ? formatCurrency(budget.budget) : '—'}
        />
        <StatCard
          label="Disponível para concessão"
          value={
            budget
              ? formatCurrency(
                  toNumber(budget.budget) - toNumber(budget.distributed) - toNumber(budget.reserved),
                )
              : '—'
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Regra de pontuação"
            subtitle={rule.data ? `Versão ${rule.data.version} · ${rule.data.label}` : ''}
          />
          {rule.data && (
            <div className="space-y-4">
              <div>
                <p className="label">Pesos por critério</p>
                <div className="space-y-2">
                  {Object.entries(rule.data.weights).map(([key, weight]) => (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm capitalize">{SCORING_LABELS[key] ?? key}</span>
                        <span className="font-mono text-xs">{weight} pts</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-secondary"
                          style={{ width: `${Math.min((weight / 50) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-outline-variant/40 pt-3">
                <p className="label">Cortes de faixa</p>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Faixa A (100%)</dt>
                    <dd className="font-mono">{rule.data.tierCutoffs.A} pts ou mais</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Faixa B (50%)</dt>
                    <dd className="font-mono">{rule.data.tierCutoffs.B} pts ou mais</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Faixa C (25%)</dt>
                    <dd className="font-mono">{rule.data.tierCutoffs.C} pts ou mais</dd>
                  </div>
                </dl>
              </div>

              <div className="border-t border-outline-variant/40 pt-3">
                <p className="label">Cobertura por faixa</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="accent">A · 100%</Badge>
                  <Badge tone="info">B · 50%</Badge>
                  <Badge tone="success">C · 25%</Badge>
                  <Badge>D · 10%</Badge>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" padded={false}>
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <CardHeader
              title="Ranking por necessidade"
              subtitle={
                ranking.loading
                  ? 'Carregando'
                  : `${list.length} candidatos em ${formatPeriod(period)}`
              }
            />
          </div>

          {ranking.loading && <LoadingBlock label="Carregando ranking" />}
          {ranking.error && (
            <div className="px-5 pb-5">
              <ErrorBlock message={ranking.error} onRetry={ranking.reload} />
            </div>
          )}
          {!ranking.loading && !ranking.error && list.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-on-surface-variant">
              Nenhuma avaliação para o período. Use “Avaliar carteira” para pontuar os alunos.
            </p>
          )}

          {list.length > 0 && (
            <div className="table-wrap border-0 border-t border-outline-variant/60">
              <table>
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">#</th>
                    <th className="table-cell">Aluno</th>
                    <th className="table-cell">Curso</th>
                    <th className="table-cell">Pontuação</th>
                    <th className="table-cell">Faixa sugerida</th>
                    <th className="table-cell">Situação</th>
                    <th className="table-cell">Mensalidade</th>
                  </tr>
                </thead>
                <tbody>
                  {list.slice(0, 100).map((item, index) => {
                    const appMeta = statusMeta.application(item.status);
                    return (
                      <tr key={item.applicationId} className="hover:bg-surface-container-low">
                        <td className="table-cell font-mono text-xs text-on-surface-variant">
                          {index + 1}
                        </td>
                        <td className="table-cell">
                          <p className="font-medium">{item.name}</p>
                          <p className="font-mono text-xs text-on-surface-variant">
                            {item.enrollmentCode}
                          </p>
                        </td>
                        <td className="table-cell text-on-surface-variant">{item.course}</td>
                        <td className="table-cell font-mono font-semibold">
                          {toNumber(item.totalScore).toFixed(1)}
                        </td>
                        <td className="table-cell">
                          {item.suggestedTier ? (
                            <Badge tone={statusMeta.tier(item.suggestedTier).tone}>
                              {statusMeta.tier(item.suggestedTier).label}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="table-cell">
                          <Badge tone={appMeta.tone}>{appMeta.label}</Badge>
                        </td>
                        <td className="table-cell font-mono text-xs">
                          {formatCurrency(item.monthlyFee)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        title="Conceder bolsas do fundo"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAllocateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAllocate} loading={busy} disabled={!selectedFund}>
              Conceder dentro do orçamento
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-on-surface-variant">
          Os candidatos são ordenados por pontuação. Cada um recebe a maior faixa possível enquanto
          houver orçamento; quando o fundo acaba, a faixa é degradada ou a bolsa é negada com
          registro do motivo.
        </p>
        <label className="label" htmlFor="fund-select">
          Fundo
        </label>
        <select
          id="fund-select"
          value={selectedFund}
          onChange={(e) => setSelectedFund(e.target.value)}
          className="input"
        >
          <option value="">Selecione um fundo</option>
          {fundOptions.map((fund) => (
            <option key={fund.id} value={fund.id}>
              {formatPeriod(fund.period)} — orçamento {formatCurrency(fund.budget)}
            </option>
          ))}
        </select>
      </Modal>

      <AllocationModal allocation={allocation} onClose={() => setAllocation(null)} />
    </>
  );
}

const SCORING_LABELS: Record<string, string> = {
  incomePerCapita: 'Renda familiar per capita',
  dropoutRisk: 'Risco de evasão',
  familyBurden: 'Encargos familiares',
  territorialSocial: 'Vulnerabilidade territorial',
  academicContinuity: 'Continuidade acadêmica',
  prioritySituations: 'Situações prioritárias',
};

function AllocationModal({
  allocation,
  onClose,
}: {
  allocation: AllocateResult | null;
  onClose: () => void;
}) {
  const isReal = Boolean(allocation && allocation.granted.length > 0);
  if (!allocation) return null;

  return (
    <Modal open onClose={onClose} title="Resultado da concessão" wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Orçamento" value={formatCurrency(allocation.budget)} />
          <StatCard label="Concedidas" value={formatNumber(allocation.grantedCount)} tone="positive" />
          <StatCard label="Não concedidas" value={formatNumber(allocation.deniedCount)} />
          <StatCard label="Saldo" value={formatCurrency(allocation.remaining)} />
        </div>

        {isReal ? (
          <div>
            <p className="label">Concedidas</p>
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Aluno</th>
                    <th className="table-cell">Faixa pedida</th>
                    <th className="table-cell">Faixa concedida</th>
                    <th className="table-cell">Valor mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.granted.map((row) => (
                    <tr key={row.studentId}>
                      <td className="table-cell">{row.name}</td>
                      <td className="table-cell">
                        <Badge tone={statusMeta.tier(row.requestedTier).tone}>
                          {statusMeta.tier(row.requestedTier).label}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Badge tone={statusMeta.tier(row.grantedTier).tone}>
                          {statusMeta.tier(row.grantedTier).label}
                        </Badge>
                      </td>
                      <td className="table-cell font-mono">
                        {formatCurrency(row.monthlyValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Alert tone="warning">
            A avaliação foi executada e o ranking atualizado. Abra a concessão para distribuir as
            bolsas dentro do orçamento do fundo.
          </Alert>
        )}
      </div>
    </Modal>
  );
}

export type { CriterionScore };