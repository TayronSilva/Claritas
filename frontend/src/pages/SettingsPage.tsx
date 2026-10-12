import { useState } from 'react';
import { institutionsApi, solanaApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, PageHeader } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';
import { statusMeta } from '../lib/labels';
import { formatDate, formatNumber, formatPercent } from '../lib/format';

export function SettingsPage() {
  const { institution, user } = useAuth();
  const institutionId = institution?.id ?? null;

  const [copied, setCopied] = useState(false);

  const solana = useAsync(() => solanaApi.status(), []);
  const detail = useAsync(
    () => institutionsApi.detail(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );

  if (!institutionId) return <PageHeader title="Configurações" />;
  if (detail.loading) return <LoadingBlock label="Carregando configurações" />;
  if (detail.error || !detail.data) {
    return (
      <>
        <PageHeader title="Configurações" />
        <ErrorBlock message={detail.error ?? 'Sem dados'} onRetry={detail.reload} />
      </>
    );
  }

  const data = detail.data;
  const status = solana.data;

  async function copyHash() {
    const active = detail.data?.scoringRuleVers[0];
    if (!active) return;
    await navigator.clipboard.writeText(JSON.stringify(active.weights));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Parâmetros da instituição, regra vigente e estado da camada de auditoria."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Instituição" />
          <dl className="space-y-2 text-sm">
            <Row label="Nome" value={data.name} />
            <Row label="Identificador" value={data.slug} mono />
            <Row label="CNPJ" value={data.cnpj ?? '—'} mono />
            <Row
              label="Situação"
              value={
                <Badge tone={statusMeta.institution(data.status).tone}>
                  {statusMeta.institution(data.status).label}
                </Badge>
              }
            />
            <Row label="Percentual ao fundo" value={`${data.fundSharePct}%`} mono />
            <Row label="Alunos" value={formatNumber(data._count.students)} mono />
            <Row label="Cobranças" value={formatNumber(data._count.charges)} mono />
            <Row label="Criada em" value={formatDate(data.createdAt)} mono />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Carteiras on-chain" subtitle="Identificadores públicos da instituição" />
          <dl className="space-y-2 text-sm">
            <Row label="Tesouraria" value={data.treasuryPub ?? 'não configurada'} mono />
            <Row label="Fee payer" value={data.feePayerPub ?? 'não configurada'} mono />
          </dl>
          {solana.loading ? (
            <p className="mt-3 text-sm text-on-surface-variant">Consultando rede…</p>
          ) : status ? (
            <div className="mt-4 space-y-2 border-t border-outline-variant/40 pt-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-on-surface-variant">Rede</span>
                <span className="font-mono">{status.network}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-on-surface-variant">Saldo do fee payer</span>
                <span className="font-mono">
                  {status.balanceSol !== null ? `${status.balanceSol.toFixed(4)} SOL` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-on-surface-variant">Situação</span>
                <Badge tone={status.ready ? 'success' : 'warning'}>
                  {status.ready ? 'Ancoragem ativa' : 'Simulação local'}
                </Badge>
              </div>
              {!status.ready && (
                <div className="pt-1">
                  <Alert tone="info">
                    Sem fee payer configurado, os lotes são consolidados localmente e a
                    ancoragem registra apenas o hash da decisão. Isso é suficiente para a
                    demonstração, mas a transação real exige a variável de ambiente no backend.
                  </Alert>
                </div>
              )}
            </div>
          ) : null}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Regra de pontuação vigente"
            subtitle={
              data.scoringRuleVers[0]
                ? `Versão ${data.scoringRuleVers[0].version} · publicada em ${formatDate(data.scoringRuleVers[0].publishedAt)}`
                : 'Nenhuma regra publicada'
            }
            action={
              <button
                onClick={copyHash}
                className="text-sm font-medium text-secondary hover:underline"
              >
                {copied ? 'Copiado' : 'Copiar pesos'}
              </button>
            }
          />
          {data.scoringRuleVers.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              A regra é criada automaticamente na primeira consulta ao serviço de bolsas.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label">Pesos</p>
                <dl className="space-y-1.5">
                  {Object.entries(data.scoringRuleVers[0].weights).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3 text-sm">
                      <dt className="capitalize text-on-surface-variant">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </dt>
                      <dd className="font-mono">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="label">Cortes de faixa</p>
                <dl className="space-y-1.5">
                  {Object.entries(data.scoringRuleVers[0].tierCutoffs).map(([tier, value]) => (
                    <div key={tier} className="flex justify-between gap-3 text-sm">
                      <dt className="text-on-surface-variant">Faixa {tier}</dt>
                      <dd className="font-mono">{value} pts</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Sessão" />
          <dl className="space-y-2 text-sm">
            <Row label="Usuário" value={user?.email ?? '—'} mono />
            <Row
              label="Papel"
              value={
                <Badge tone={statusMeta.role(user!.role).tone}>
                  {statusMeta.role(user!.role).label}
                </Badge>
              }
            />
            <Row
              label="Percentual vigente"
              value={formatPercent(detail.data.fundSharePct)}
              mono
            />
          </dl>
          <div className="mt-4">
            <Alert tone="info">
              Nenhum dado pessoal é enviado à blockchain. A cadeia registra hash do processo,
              versão da regra, orçamento e comprovantes de repasse.
            </Alert>
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}