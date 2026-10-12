import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentsApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Alert, PageHeader } from '../components/Layout';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';
import { formatNumber } from '../lib/format';
import { ApiError } from '../api/client';

type ParsedRow = {
  line: number;
  fullName: string;
  email: string;
  course: string;
  enrollmentCode: string;
  monthlyFee: number;
  valid: boolean;
  problem: string | null;
};

const TEMPLATE = 'nome,email,curso,matricula,mensalidade\nMaria Souza,maria@aluno.claritas.edu.br,Administração,,1000\n';

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase();
  const start = header.includes('nome') ? 1 : 0;
  const seen = new Set<string>();
  const rows: ParsedRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const [fullName = '', email = '', course = '', enrollmentCode = '', feeRaw = ''] = cols;
    const monthlyFee = Number(feeRaw.replace(',', '.'));
    let problem: string | null = null;

    if (!fullName) problem = 'Nome ausente';
    else if (!course) problem = 'Curso ausente';
    else if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) problem = 'Mensalidade inválida';
    else if (enrollmentCode && seen.has(enrollmentCode)) problem = 'Matrícula duplicada no arquivo';
    else if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problem = 'E-mail inválido';

    if (enrollmentCode) seen.add(enrollmentCode);
    rows.push({
      line: i + 1,
      fullName,
      email,
      course,
      enrollmentCode,
      monthlyFee,
      valid: problem === null,
      problem,
    });
  }
  return rows;
}

export function ImportStudentsPage() {
  const { institution } = useAuth();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setRows(parseCsv(String(reader.result ?? '')));
    reader.readAsText(file);
  }

  const valid = rows.filter((r) => r.valid);
  const invalid = rows.filter((r) => !r.valid);

  async function confirmImport() {
    if (!institution) return;
    setImporting(true);
    setError(null);
    let ok = 0;
    let failed = 0;
    for (const row of valid) {
      try {
        await studentsApi.create({
          institutionId: institution.id,
          fullName: row.fullName,
          email: row.email || undefined,
          course: row.course,
          enrollmentCode: row.enrollmentCode || undefined,
          monthlyFee: row.monthlyFee,
        });
        ok += 1;
      } catch (err) {
        if (err instanceof ApiError) failed += 1;
        else failed += 1;
      }
    }
    setResult({ ok, failed });
    setImporting(false);
  }

  return (
    <>
      <PageHeader
        title="Importar alunos"
        description="Cadastre alunos em lote via CSV e valide inconsistências antes de confirmar."
        actions={
          <Button variant="ghost" onClick={() => navigate('/alunos')}>
            Voltar para alunos
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {result && (
        <div className="mb-4">
          <Alert tone={result.failed ? 'warning' : 'success'}>
            Importação concluída: {formatNumber(result.ok)} importados, {formatNumber(result.failed)}{' '}
            falharam.
          </Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="1. Enviar arquivo" subtitle="CSV com cabeçalho: nome, email, curso, matricula, mensalidade" />
          <button
            type="button"
            onClick={() => document.getElementById('csv-template')?.click()}
            className="mb-3 text-xs font-medium text-secondary hover:underline"
          >
            Baixar modelo
          </button>
          <input
            id="csv-template"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={() => {
              const blob = new Blob([TEMPLATE], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'modelo_alunos.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
          <label
            htmlFor="csv-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center"
          >
            <p className="text-sm font-medium text-on-surface">
              {fileName ?? 'Selecione o arquivo CSV'}
            </p>
            <span className="mt-1 text-[11px] text-on-surface-variant">
              Até 10 MB por arquivo
            </span>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="2. Validação" subtitle="Registros válidos e inconsistências isoladas" />
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">
              Envie um CSV para validar.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                  <p className="font-mono text-xs uppercase text-on-surface-variant">
                    Alunos válidos
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-success">
                    {formatNumber(valid.length)}
                  </p>
                  <p className="text-xs text-on-surface-variant">de {formatNumber(rows.length)} linhas</p>
                </div>
                <div className="rounded-lg border border-error/30 bg-error/5 p-4">
                  <p className="font-mono text-xs uppercase text-on-surface-variant">
                    Inconsistências isoladas
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-error">
                    {formatNumber(invalid.length)}
                  </p>
                  <p className="text-xs text-on-surface-variant">serão ignoradas</p>
                </div>
              </div>

              {invalid.length > 0 && (
                <div className="mt-4 table-wrap">
                  <table>
                    <thead className="table-head">
                      <tr>
                        <th className="table-cell">Linha</th>
                        <th className="table-cell">Nome</th>
                        <th className="table-cell">Problema</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invalid.slice(0, 8).map((row) => (
                        <tr key={row.line}>
                          <td className="table-cell font-mono text-xs">#{row.line}</td>
                          <td className="table-cell">{row.fullName || '—'}</td>
                          <td className="table-cell text-error">{row.problem}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button onClick={confirmImport} loading={importing} disabled={valid.length === 0 || !institution}>
                  Confirmar importação de {formatNumber(valid.length)} alunos
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {rows.length > 0 && (
        <div className="mt-5">
          <Badge tone="info">
            Total processado: {formatNumber(rows.length)} linhas · {formatNumber(valid.length)} aptas ·{' '}
            {formatNumber(invalid.length)} inconsistentes
          </Badge>
        </div>
      )}
    </>
  );
}
