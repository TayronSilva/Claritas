import { Link, useParams } from 'react-router-dom';
import { scholarshipsApi, studentsApi } from '../api';
import { useAsync } from '../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';
import { statusMeta } from '../lib/labels';
import { formatCurrency, formatDate, formatNumber, toNumber } from '../lib/format';

const FLAG_LABELS: Record<string, string> = {
  PCD: 'Deficiência',
  VIOLENCE: 'Situação de violência',
  DISASTER: 'Desastre',
  REFUGEE: 'Refugiada ou migrante',
  FAMILY_DISASTER: 'Desastre familiar',
  PUBLIC_SERVANT_DEPENDENT: 'Dependente de servidor público',
};

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const student = useAsync(
    () => studentsApi.detail(id!),
    [id],
    { enabled: Boolean(id) },
  );
  const preview = useAsync(
    () => scholarshipsApi.preview(id!),
    [id],
    { enabled: Boolean(id) },
  );

  if (student.loading) return <LoadingBlock label="Carregando aluno" />;
  if (student.error || !student.data) {
    return (
      <>
        <PageHeader title="Aluno" />
        <ErrorBlock message={student.error ?? 'Aluno não encontrado'} onRetry={student.reload} />
      </>
    );
  }

  const data = student.data;
  const profile = data.socialProfile;
  const statusMetaStudent = statusMeta.student(data.status);
  const previewData = preview.data;
  const score = previewData?.result;

  return (
    <>
      <PageHeader
        title={data.fullName}
        description={`${data.course} · matrícula ${data.enrollmentCode}`}
        actions={
          <Link
            to="/alunos"
            className="rounded border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
          >
            Voltar
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mensalidade" value={formatCurrency(data.monthlyFee)} />
        <StatCard
          label="Situação"
          value={statusMetaStudent.label}
          tone={data.status === 'ACTIVE' ? 'positive' : 'default'}
        />
        <StatCard
          label="Pontuação de necessidade"
          value={score ? `${score.totalScore.toFixed(1)} / 100` : '—'}
          hint={score?.suggestedTier ? `Faixa sugerida ${score.suggestedTier}` : undefined}
        />
        <StatCard
          label="Bolsa ativa"
          value={
            data.awards.length > 0 ? formatCurrency(data.awards[0].monthlyValue) : 'Nenhuma'
          }
          tone={data.awards.length > 0 ? 'positive' : 'default'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Decomposição da pontuação"
              subtitle={
                score
                  ? `Regra versão ${previewData.rule.version} · ${previewData.rule.label}`
                  : 'Calculando pontuação'
              }
            />
            {preview.loading && <p className="text-sm text-on-surface-variant">Carregando…</p>}
            {preview.error && <Alert tone="error">{preview.error}</Alert>}

            {score && (
              <>
                {!score.eligibility.passed && (
                  <div className="mb-4">
                    <Alert tone="warning" title="Não elegível">
                      <ul className="list-inside list-disc">
                        {score.eligibility.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </Alert>
                  </div>
                )}

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(score.totalScore, 100)}%` }}
                  />
                </div>

                <div className="space-y-3">
                  {score.breakdown.map((criterion) => (
                    <div key={criterion.key}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-sm">{criterion.label}</span>
                        <span className="font-mono text-xs text-on-surface-variant">
                          {criterion.earned.toFixed(1)} / {criterion.max}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-secondary"
                          style={{ width: `${Math.min(criterion.pct * 100, 100)}%` }}
                        />
                      </div>
                      {criterion.evidence.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {criterion.evidence.map((line) => (
                            <li key={line} className="text-xs text-on-surface-variant">
                              · {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <CardHeader title="Cobranças recentes" subtitle="Últimas movimentações da mensalidade" />
            {data.charges.length === 0 ? (
              <p className="py-6 text-center text-sm text-on-surface-variant">
                Nenhuma cobrança emitida.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead className="table-head">
                    <tr>
                      <th className="table-cell">Referência</th>
                      <th className="table-cell">Vencimento</th>
                      <th className="table-cell">Valor</th>
                      <th className="table-cell">Status</th>
                      <th className="table-cell">Pago em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charges.map((charge) => {
                      const meta = statusMeta.charge(charge.status);
                      return (
                        <tr key={charge.id}>
                          <td className="table-cell font-mono text-xs">{charge.reference}</td>
                          <td className="table-cell font-mono text-xs">
                            {formatDate(charge.dueDate)}
                          </td>
                          <td className="table-cell font-mono">
                            {formatCurrency(charge.amount)}
                          </td>
                          <td className="table-cell">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                          <td className="table-cell font-mono text-xs">
                            {formatDate(charge.paidAt)}
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

        <div className="space-y-5">
          <Card>
            <CardHeader title="Identificação" />
            <dl className="space-y-2 text-sm">
              <Row label="Matrícula" value={data.enrollmentCode} mono />
              <Row label="Curso" value={data.course} />
              <Row label="Ano de entrada" value={data.intakeYear ? String(data.intakeYear) : '—'} />
              <Row label="E-mail" value={data.email ?? '—'} />
              <Row
                label="Carteira"
                value={data.walletPub ? `${data.walletPub.slice(0, 12)}…` : 'sem carteira'}
                mono
              />
            </dl>
          </Card>

          {profile && (
            <Card>
              <CardHeader
                title="Perfil social"
                subtitle="Base da pontuação. Fora da blockchain."
              />
              <dl className="space-y-2 text-sm">
                <Row
                  label="Renda per capita"
                  value={formatCurrency(profile.incomePerCapita)}
                  mono
                />
                <Row label="Pessoas na casa" value={formatNumber(profile.householdSize)} />
                <Row label="Dependentes" value={formatNumber(profile.dependentsCount)} />
                <Row
                  label="Cobranças vencidas"
                  value={formatNumber(profile.overdueChargesCount)}
                />
                <Row
                  label="Média geral"
                  value={
                    profile.currentGradeAverage ? toNumber(profile.currentGradeAverage).toFixed(1) : '—'
                  }
                  mono
                />
                <Row
                  label="Frequência"
                  value={profile.attendancePct ? `${toNumber(profile.attendancePct).toFixed(0)}%` : '—'}
                  mono
                />
              </dl>

              {profile.priorityFlags.length > 0 && (
                <div className="mt-4 border-t border-outline-variant/40 pt-3">
                  <p className="label">Situações prioritárias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.priorityFlags.map((flag) => (
                      <Badge key={flag.id} tone="accent">
                        {FLAG_LABELS[flag.flag] ?? flag.flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-outline-variant/40 pt-3">
                <p className="label">Indicadores booleanos</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.caresForElderlyOrPwd && <Badge tone="accent">Cuida de idoso ou PCD</Badge>}
                  {profile.recentIncomeLoss && <Badge tone="accent">Perda de renda recente</Badge>}
                  {profile.transportDifficulty && <Badge tone="warning">Dificuldade de transporte</Badge>}
                  {profile.housingInstability && <Badge tone="warning">Moradia instável</Badge>}
                  {profile.foodInsecurity && <Badge tone="warning">Insegurança alimentar</Badge>}
                </div>
              </div>
            </Card>
          )}

          {data.awards.length > 0 && (
            <Card>
              <CardHeader title="Bolsas ativas" />
              <div className="space-y-2">
                {data.awards.map((award) => {
                  const tier = statusMeta.tier(award.tier);
                  return (
                    <div
                      key={award.id}
                      className="rounded border border-outline-variant/50 bg-surface-container-low p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={tier.tone}>{tier.label}</Badge>
                        <span className="font-mono text-sm">
                          {formatCurrency(award.monthlyValue)}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-on-surface-variant">
                        cobertura {award.coveragePct}% · desde {formatDate(award.startsAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}