import { useRef, useState } from 'react';
import { documentsApi, studentsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock } from '../../components/Layout';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { toNumber } from '../../lib/format';

const DOC_TYPES = [
  'Comprovante de Renda (Holerite, DECORE ou Extrato)',
  'Histórico Escolar / Rendimento Acadêmico',
  'Comprovante de Residência Atualizado',
  'Outros Documentos Complementares',
];

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['.pdf', '.jpg', '.jpeg', '.png'];

type UploadResult = {
  fileName: string;
  bytes: number;
  documentsRef: string;
  uploadedAt: string;
};

export function PortalDocumentsPage() {
  const student = useAsync(() => studentsApi.me(), []);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (student.loading) return <LoadingBlock label="Carregando documentos" />;
  if (student.error) return <ErrorBlock message={student.error} onRetry={student.reload} />;
  const data = student.data;
  if (!data) return null;

  const award = data.awards.find((a) => a.status === 'ACTIVE') ?? data.awards[0] ?? null;
  const coverage = award ? toNumber(award.coveragePct) : 0;

  function validate(chosen: File): string | null {
    const ext = chosen.name.slice(chosen.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED.includes(ext)) return 'Formato aceito: PDF, JPG ou PNG';
    if (chosen.size > MAX_BYTES) {
      return `Arquivo de ${(chosen.size / 1024 / 1024).toFixed(1)} MB. Limite é 10 MB`;
    }
    return null;
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    setDone(null);
    setError(null);
    if (!chosen) {
      setFile(null);
      return;
    }
    const problem = validate(chosen);
    if (problem) {
      setError(problem);
      setFile(null);
      event.target.value = '';
      return;
    }
    setError(null);
    setFile(chosen);
  }

  async function handleSubmit() {
    if (!file) return;
    setSending(true);
    setError(null);
    try {
      const result = await documentsApi.upload(file, docType);
      setDone(result);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      student.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no envio');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
          Portal do Aluno · Gestão Acadêmica &amp; Benefícios
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-on-surface">Documentos e Renovação</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Envie e acompanhe os documentos exigidos para a manutenção do seu benefício.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Vínculo: {data.enrollmentCode}</Badge>
        <Badge tone="accent">
          {award ? `Bolsa ${coverage}% ativa` : 'Sem bolsa ativa'}
        </Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-bold text-on-surface">Novo envio</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Selecione a categoria e anexe o comprovante legível para auditoria da comissão de bolsas.
          </p>

          <label className="label mt-4" htmlFor="doc-type">
            Tipo de documento *
          </label>
          <select
            id="doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="input"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label
            htmlFor="doc-file"
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center transition-colors hover:bg-surface-container"
          >
            <p className="text-sm font-medium text-on-surface">
              {file ? file.name : 'Arraste ou clique para enviar o arquivo'}
            </p>
            <span className="mt-1 text-[11px] text-on-surface-variant">
              {file
                ? `${(file.size / 1024).toFixed(0)} KB`
                : 'Formatos aceitos: PDF ou JPG · Máx: 10 MB'}
            </span>
            <input
              id="doc-file"
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handlePick}
            />
          </label>

          {error && (
            <div className="mt-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          {done && (
            <div className="mt-3">
              <Alert tone="success" title="Documento enviado">
                {done.fileName} · {(done.bytes / 1024).toFixed(0)} KB · referência{' '}
                <span className="font-mono">{done.documentsRef}</span>
              </Alert>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            loading={sending}
            disabled={!file}
            className="mt-4 w-full"
          >
            Enviar documento
          </Button>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            O arquivo fica fora da blockchain. A rede recebe apenas a referência para auditoria.
          </p>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5">
            <h3 className="font-display text-lg font-bold text-on-surface">Histórico de envios</h3>
            <p className="text-xs text-on-surface-variant">
              {data.socialProfile?.documentsRef
                ? `Referência: ${data.socialProfile.documentsRef}`
                : 'Nenhum documento registrado'}
            </p>
          </div>
          {done ? (
            <div className="px-5 py-8 text-center text-sm text-on-surface-variant">
              Último envio: {done.fileName} em {new Date(done.uploadedAt).toLocaleString('pt-BR')}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-on-surface-variant">
              Nenhum documento enviado ainda.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Alert tone="info">
          Próxima renovação obrigatória: envie os comprovantes dentro do prazo do ciclo letivo corrente.
        </Alert>
      </div>
    </>
  );
}
