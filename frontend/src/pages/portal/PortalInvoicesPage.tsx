import { useState } from 'react';
import { chargesApi, studentsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock } from '../../components/Layout';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { statusMeta } from '../../lib/labels';
import { formatCurrency, formatDate, formatPeriod, toNumber } from '../../lib/format';
import { ApiError } from '../../api/client';

export function PortalInvoicesPage() {
  const student = useAsync(() => studentsApi.me(), []);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (student.loading) return <LoadingBlock label="Carregando faturas" />;
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
  const history = data.charges.filter((c) => c.id !== openCharge?.id);

  async function copyCode(chargeId: string) {
    setError(null);
    try {
      const link = await chargesApi.paymentLink(chargeId);
      await navigator.clipboard.writeText(link.qrPayload);
      setCopied(chargeId);
      setTimeout(() => setCopied(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar o código de pagamento');
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
          Portal do Aluno · Gestão Financeira Individual
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-on-surface">Minhas Faturas</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Acompanhe seu histórico financeiro, descontos aplicados e próximos vencimentos.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <Card className="border-2 border-primary/40">
        <div className="flex flex-col gap-3 border-b border-outline-variant/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface">Fatura em aberto</h2>
            <span className="text-xs text-on-surface-variant">
              {openCharge ? `Competência ${formatPeriod(openCharge.dueDate.slice(0, 7))}` : 'Nenhuma fatura em aberto'}
            </span>
          </div>
          {openCharge && (
            <Badge tone={openCharge.status === 'OVERDUE' ? 'error' : 'warning'}>
              {statusMeta.charge(openCharge.status).label}
            </Badge>
          )}
        </div>

        {openCharge ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-5 rounded-lg border border-outline-variant/50 bg-surface-container-low p-4 md:grid-cols-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                  Competência
                </p>
                <p className="mt-1 font-semibold text-on-surface">
                  {formatPeriod(openCharge.dueDate.slice(0, 7))}
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                  Vencimento
                </p>
                <p className="mt-1 font-semibold text-on-surface">{formatDate(openCharge.dueDate)}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                  Composição
                </p>
                <p className="mt-1 text-sm text-outline line-through">{formatCurrency(gross)}</p>
                <p className="text-xs font-semibold text-success">
                  Desconto bolsa ({coverage}%) - {formatCurrency(gross - net)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
                  Valor líquido
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-primary">
                  {formatCurrency(net)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-on-surface-variant">
                Código Pix copia e cola e boleto expiram em 24h após emissão.
              </span>
              <Button variant="ghost" onClick={() => copyCode(openCharge.id)}>
                {copied === openCharge.id ? 'Código copiado!' : 'Copiar linha digitável'}
              </Button>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            Você está em dia. Nenhuma fatura pendente.
          </p>
        )}
      </Card>

      <Card className="mt-5" padded={false}>
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h3 className="font-display text-lg font-bold text-on-surface">Histórico de pagamentos</h3>
            <p className="text-xs text-on-surface-variant">
              {history.filter((c) => c.status === 'PAID').length} faturas liquidadas
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-on-surface-variant">
            Sem histórico de faturas.
          </p>
        ) : (
          <div className="table-wrap border-0 border-t border-outline-variant/60">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Competência</th>
                  <th className="table-cell">Vencimento</th>
                  <th className="table-cell">Valor original</th>
                  <th className="table-cell">Valor pago</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Autenticação</th>
                </tr>
              </thead>
              <tbody>
                {history.map((charge) => {
                  const meta = statusMeta.charge(charge.status);
                  return (
                    <tr key={charge.id} className="hover:bg-surface-container-low">
                      <td className="table-cell font-mono text-xs">
                        {formatPeriod(charge.dueDate.slice(0, 7))}
                      </td>
                      <td className="table-cell text-on-surface-variant">
                        {formatDate(charge.dueDate)}
                      </td>
                      <td className="table-cell font-mono text-xs text-outline line-through">
                        {formatCurrency(gross)}
                      </td>
                      <td className="table-cell font-mono font-semibold">
                        {formatCurrency(charge.amount)}
                      </td>
                      <td className="table-cell">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="table-cell font-mono text-xs text-on-surface-variant">
                        {charge.payment?.txSignature
                          ? `${charge.payment.txSignature.slice(0, 12)}…`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-5">
        <Alert tone="info">
          Transações e splits registrados e auditados via Solana Network.
        </Alert>
      </div>
    </>
  );
}
