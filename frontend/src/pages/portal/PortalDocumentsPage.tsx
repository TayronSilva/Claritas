import { useState } from 'react';
import { studentsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock } from '../../components/Layout';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { toNumber } from '../../lib/format';

const DOC_TYPES = [
  'Comprovante de Renda (Holerite, DECORE ou Extrato)',
  'Histórico Escolar / Rendimento Acadêmico',
  'Comprovante de Residência Atualizado',
  'Outros Documentos Complementares',
];

export function PortalDocumentsPage() {
  const student = useAsync(() => studentsApi.me(), []);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [fileName, setFileName] = useState<string | null>(null);

  if (student.loading) return <LoadingBlock label="Carregando documentos" />;
  if (student.error) return <ErrorBlock message={student.error} onRetry={student.reload} />;
  const data = student.data;
  if (!data) return null;

  const award = data.awards.find((a) => a.status === 'ACTIVE') ?? data.awards[0] ?? null;
  const coverage = award ? toNumber(award.coveragePct) : 0;

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
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center"
          >
            <p className="text-sm font-medium text-on-surface">
              {fileName ?? 'Arraste ou clique para enviar o arquivo'}
            </p>
            <span className="mt-1 text-[11px] text-on-surface-variant">
              Formatos aceitos: PDF ou JPG · Máx: 10 MB
            </span>
            <input
              id="doc-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>

          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded bg-primary px-4 py-2 text-sm font-medium text-white opacity-60"
            title="Upload ainda não habilitado no backend"
          >
            Enviar documento
          </button>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            Seus arquivos são criptografados e submetidos à validação cadastral.
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
          <div className="px-5 py-12 text-center text-sm text-on-surface-variant">
            Nenhum documento enviado ainda.
          </div>
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
