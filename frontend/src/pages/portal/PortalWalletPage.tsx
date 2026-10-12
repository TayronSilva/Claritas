import { fundApi, studentsApi } from '../../api';
import type { FundStats } from '../../api/types';
import { useAsync } from '../../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, StatCard } from '../../components/Layout';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { formatCurrency, toNumber } from '../../lib/format';

export function PortalWalletPage() {
  const student = useAsync(() => studentsApi.me(), []);
  const institutionId = student.data?.institutionId ?? null;
  const stats = useAsync<FundStats>(
    () => fundApi.stats(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );

  if (student.loading) return <LoadingBlock label="Carregando carteira" />;
  if (student.error) return <ErrorBlock message={student.error} onRetry={student.reload} />;
  const data = student.data;
  if (!data) return null;

  const award = data.awards.find((a) => a.status === 'ACTIVE') ?? data.awards[0] ?? null;
  const monthlyValue = award ? toNumber(award.monthlyValue) : 0;

  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
          Portal do Aluno · Gestão Financeira &amp; Rendimentos
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-on-surface">Sua Carteira</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Acompanhe os rendimentos do Fundo de Permanência, pague faturas ou resgate o saldo.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-2 border-primary/40 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-on-surface">Saldo liberado para uso</h2>
            <Badge tone="accent">Liquidação instantânea</Badge>
          </div>
          <p className="mt-3 font-display text-4xl font-extrabold text-on-surface">
            {formatCurrency(0)}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Saldo acumulado via Fundo de Permanência e cashback de pontualidade.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface opacity-60"
            >
              Pagar fatura com saldo
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant opacity-60"
            >
              Sacar para minha conta
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-base font-semibold text-on-surface">
            Rendimento acumulado
          </h3>
          <p className="mt-2 font-display text-3xl font-bold text-success">{formatCurrency(0)}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-on-surface-variant">Bolsa ativa</dt>
              <dd className="font-mono">{award ? `${award.coveragePct}%` : '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-on-surface-variant">Subvenção mensal</dt>
              <dd className="font-mono">{formatCurrency(monthlyValue)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-on-surface-variant">Fundo da instituição</dt>
              <dd className="font-mono">
                {stats.data ? formatCurrency(stats.data.totals.available) : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[11px] text-on-surface-variant">
            Auditado on-chain via Solana Devnet.
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Saldo disponível" value={formatCurrency(0)} />
        <StatCard label="Rendimento no ciclo" value={formatCurrency(0)} tone="positive" />
        <StatCard label="Resgates" value={formatCurrency(0)} />
        <StatCard
          label="Fundo disponível"
          value={stats.data ? formatCurrency(stats.data.totals.available) : '—'}
        />
      </div>

      <Card className="mt-5" padded={false}>
        <div className="px-5 pt-5">
          <h3 className="font-display text-lg font-bold text-on-surface">Extrato completo</h3>
          <p className="text-xs text-on-surface-variant">
            Histórico de rendimentos creditados, abatimentos e resgates.
          </p>
        </div>
        <div className="px-5 py-12 text-center text-sm text-on-surface-variant">
          Nenhuma movimentação registrada no momento.
        </div>
      </Card>

      <div className="mt-5">
        <Alert tone="info">
          Auditoria criptográfica ativa · Todas as operações são consolidadas na rede Solana Devnet.
        </Alert>
      </div>
    </>
  );
}
