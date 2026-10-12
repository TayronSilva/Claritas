import { institutionsApi } from '../api';
import { useAsync } from '../hooks/useAsync';
import { ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Card, CardHeader } from '../components/Card';
import { formatCurrency, formatNumber, formatPercent, toNumber } from '../lib/format';

type ReportRow = {
  id: string;
  name: string;
  students: number;
  totalCharges: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
  inadimplencia: number;
  activeAwards: number;
};

export function ReportsPage() {
  const report = useAsync<ReportRow[]>(async () => {
    const units = await institutionsApi.list();
    return Promise.all(
      units.map(async (unit) => {
        const d = await institutionsApi.dashboard(unit.id);
        const totalCharges = d.chargesByStatus.reduce((acc, c) => acc + c.count, 0);
        const totalAmount = d.chargesByStatus.reduce((acc, c) => acc + toNumber(c.amount), 0);
        const paidAmount = d.chargesByStatus
          .filter((c) => c.status === 'PAID')
          .reduce((acc, c) => acc + toNumber(c.amount), 0);
        const overdueCount = d.chargesByStatus
          .filter((c) => c.status === 'OVERDUE')
          .reduce((acc, c) => acc + c.count, 0);
        return {
          id: unit.id,
          name: unit.name,
          students: d.students,
          totalCharges,
          totalAmount,
          paidAmount,
          overdueAmount: d.chargesByStatus
            .filter((c) => c.status === 'OVERDUE')
            .reduce((acc, c) => acc + toNumber(c.amount), 0),
          inadimplencia: totalCharges ? (overdueCount / totalCharges) * 100 : 0,
          activeAwards: d.activeAwards,
        };
      }),
    );
  }, []);

  if (report.loading) return <LoadingBlock label="Gerando relatórios" />;
  if (report.error) return <ErrorBlock message={report.error} onRetry={report.reload} />;
  const rows = report.data ?? [];

  const totalAmount = rows.reduce((acc, r) => acc + r.totalAmount, 0);
  const totalPaid = rows.reduce((acc, r) => acc + r.paidAmount, 0);
  const totalStudents = rows.reduce((acc, r) => acc + r.students, 0);
  const avgInad = rows.length
    ? rows.reduce((acc, r) => acc + r.inadimplencia, 0) / rows.length
    : 0;

  return (
    <>
      <PageHeader
        title="Relatórios comparativos"
        description="Compare o desempenho financeiro e acadêmico entre as unidades da rede."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unidades comparadas" value={formatNumber(rows.length)} />
        <StatCard label="Alunos ativos" value={formatNumber(totalStudents)} />
        <StatCard label="Volume cobrado" value={formatCurrency(totalAmount)} />
        <StatCard
          label="Inadimplência média"
          value={formatPercent(avgInad)}
          tone={avgInad > 6 ? 'negative' : 'positive'}
        />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardHeader
            title="Comparativo por unidade"
            subtitle="Base normalizada por ciclo de faturamento"
          />
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-on-surface-variant">
            Sem dados para comparar.
          </p>
        ) : (
          <div className="table-wrap border-0">
            <table>
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Unidade</th>
                  <th className="table-cell">Alunos</th>
                  <th className="table-cell">Cobranças</th>
                  <th className="table-cell">Volume</th>
                  <th className="table-cell">Liquidado</th>
                  <th className="table-cell">Inadimplência</th>
                  <th className="table-cell">Bolsas ativas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low">
                    <td className="table-cell font-medium">{row.name}</td>
                    <td className="table-cell font-mono">{formatNumber(row.students)}</td>
                    <td className="table-cell font-mono">{formatNumber(row.totalCharges)}</td>
                    <td className="table-cell font-mono">{formatCurrency(row.totalAmount)}</td>
                    <td className="table-cell font-mono text-success">
                      {formatCurrency(row.paidAmount)}
                    </td>
                    <td
                      className={`table-cell font-mono ${row.inadimplencia > 6 ? 'text-error' : ''}`}
                    >
                      {formatPercent(row.inadimplencia)}
                    </td>
                    <td className="table-cell font-mono">{formatNumber(row.activeAwards)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Índice de liquidação da rede"
          value={totalAmount ? formatPercent((totalPaid / totalAmount) * 100) : '—'}
          tone="positive"
        />
        <StatCard label="Volume total comparado" value={formatCurrency(totalAmount)} />
      </div>
    </>
  );
}
