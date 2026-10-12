import { useNavigate } from 'react-router-dom';
import { studentsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, StatCard } from '../../components/Layout';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card, CardHeader } from '../../components/Card';
import { statusMeta } from '../../lib/labels';
import { formatCurrency, formatDate, formatPeriod, toNumber } from '../../lib/format';

export function PortalHomePage() {
  const navigate = useNavigate();
  const student = useAsync(() => studentsApi.me(), []);

  if (student.loading) return <LoadingBlock label="Carregando seu portal" />;
  if (student.error) return <ErrorBlock message={student.error} onRetry={student.reload} />;
  const data = student.data;
  if (!data) return null;

  const award = data.awards.find((a) => a.status === 'ACTIVE') ?? data.awards[0] ?? null;
  const coverage = award ? toNumber(award.coveragePct) : 0;
  const gross = toNumber(data.monthlyFee);
  const net = gross * (1 - coverage / 100);
  const openCharge =
    data.charges.find((c) => c.status === 'PENDING') ??
    data.charges.find((c) => c.status === 'OVERDUE') ??
    null;
  const studentStatus = statusMeta.student(data.status);

  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
          Portal do Aluno · Gestão Financeira Individual
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-on-surface">
          Olá, {data.fullName.split(' ')[0]}.
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Vínculo: matrícula {data.enrollmentCode}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Seu curso" subtitle={`Matrícula ${data.enrollmentCode}`} />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <dt className="text-on-surface-variant">Curso</dt>
              <dd className="font-medium text-on-surface">{data.course}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <dt className="text-on-surface-variant">Situação</dt>
              <dd>
                <Badge tone={studentStatus.tone}>{studentStatus.label}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <dt className="text-on-surface-variant">Ingresso</dt>
              <dd className="font-mono text-on-surface">{data.intakeYear ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-on-surface-variant">Mensalidade</dt>
              <dd className="font-mono font-semibold text-on-surface">
                {formatCurrency(gross)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="border-primary/40">
          <CardHeader
            title="Mensalidade atual"
            subtitle={openCharge ? `Competência ${formatPeriod(openCharge.dueDate.slice(0, 7))}` : 'Sem fatura em aberto'}
            action={
              openCharge ? (
                <Badge tone={openCharge.status === 'OVERDUE' ? 'error' : 'warning'}>
                  {statusMeta.charge(openCharge.status).label}
                </Badge>
              ) : (
                <Badge tone="success">Em dia</Badge>
              )
            }
          />
          <div className="space-y-2 rounded-lg border border-outline-variant/50 bg-surface-container-low p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Mensalidade base</span>
              <span className="font-mono">{formatCurrency(gross)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">
                Bolsa aplicada ({coverage > 0 ? `${coverage}%` : '—'})
              </span>
              <span className="font-mono font-semibold text-success">
                - {formatCurrency(gross - net)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-outline-variant/50 pt-2">
              <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
                Total a pagar
              </span>
              <span className="font-display text-2xl font-extrabold text-on-surface">
                {formatCurrency(net)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Vencimento</span>
            <span className="font-mono font-semibold text-on-surface">
              {openCharge ? formatDate(openCharge.dueDate) : '—'}
            </span>
          </div>
          <Button className="mt-4 w-full" onClick={() => navigate('/portal/faturas')}>
            Copiar código de pagamento
          </Button>
        </Card>

        <Card>
          <CardHeader
            title="Manutenção de bolsa"
            action={
              award ? (
                <Badge tone="accent">Bolsa {coverage}% ativa</Badge>
              ) : (
                <Badge>Sem bolsa</Badge>
              )
            }
          />
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {award
              ? 'Para garantir a continuidade do benefício no próximo ciclo, envie os comprovantes de renda ou frequência.'
              : 'Você não possui bolsa ativa no momento.'}
          </p>
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
            <p className="text-xs font-medium text-on-surface">
              Arraste ou clique para enviar o comprovante (PDF/JPG)
            </p>
            <span className="mt-1 text-[11px] text-on-surface-variant">Máximo: 10 MB por arquivo</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Validade</span>
            <span className="font-mono text-on-surface">
              {award?.endsAt ? formatDate(award.endsAt) : '—'}
            </span>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Faturas em aberto" value={String(data.charges.filter((c) => c.status === 'PENDING' || c.status === 'OVERDUE').length)} />
        <StatCard label="Faturas pagas" value={String(data.charges.filter((c) => c.status === 'PAID').length)} tone="positive" />
        <StatCard label="Bolsa" value={award ? `${coverage}%` : '—'} />
        <StatCard label="Carteira" value={formatCurrency(0)} hint="Saldo do fundo" />
      </div>

      <div className="mt-6">
        <Alert tone="info">
          Sincronização cadastral e contábil ativa · Transações auditadas via Solana.
        </Alert>
      </div>
    </>
  );
}
