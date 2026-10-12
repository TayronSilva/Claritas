import { useState } from 'react';
import { governanceApi } from '../api';
import type { Proposal, ProposalType, VoteChoice } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { Alert, ErrorBlock, LoadingBlock, PageHeader, StatCard } from '../components/Layout';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardHeader } from '../components/Card';
import { Modal } from '../components/Modal';
import { labels, statusMeta } from '../lib/labels';
import { addDaysIso, formatDate, formatDateTime, formatNumber, truncate } from '../lib/format';
import { ApiError } from '../api/client';

export function GovernancePage() {
  const { institution, user } = useAuth();
  const institutionId = institution?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proposals = useAsync(
    () => governanceApi.proposals(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );
  const audit = useAsync(
    () => governanceApi.auditTrail(institutionId!),
    [institutionId],
    { enabled: Boolean(institutionId) },
  );

  const list = proposals.data ?? [];
  const open = list.filter((p) => p.status === 'OPEN');
  const executed = list.filter((p) => p.status === 'APPROVED' || p.status === 'EXECUTED');
  const anchored = (audit.data ?? []).filter((a) => a.status === 'ANCHORED');

  const canCreate =
    user?.role === 'PLATFORM_ADMIN' ||
    user?.role === 'INSTITUTION_FINANCE' ||
    user?.role === 'COMMITTEE_MEMBER';

  if (!institutionId) return <PageHeader title="Governança" />;
  if (proposals.loading) return <LoadingBlock label="Carregando propostas" />;
  if (proposals.error) {
    return (
      <>
        <PageHeader title="Governança" />
        <ErrorBlock message={proposals.error} onRetry={proposals.reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Governança do fundo"
        description="O estudante aprova prioridades e percentuais. Casos individuais nunca entram em votação popular."
        actions={
          canCreate && (
            <Button onClick={() => setCreateOpen(true)}>Nova proposta</Button>
          )
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Propostas" value={formatNumber(list.length)} />
        <StatCard label="Em votação" value={formatNumber(open.length)} tone="positive" />
        <StatCard label="Decididas" value={formatNumber(executed.length)} />
        <StatCard label="Registros ancorados" value={formatNumber(anchored.length)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {list.length === 0 ? (
            <Card>
              <p className="py-10 text-center text-sm text-on-surface-variant">
                Nenhuma proposta registrada.
              </p>
            </Card>
          ) : (
            list.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onOpen={() => setSelectedId(proposal.id)}
                onVote={async (choice) => {
                  setBusy(true);
                  setError(null);
                  try {
                    await governanceApi.vote(proposal.id, choice);
                    proposals.reload();
                    if (selectedId === proposal.id) setSelectedId(null);
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Falha ao votar');
                  } finally {
                    setBusy(false);
                  }
                }}
                busy={busy}
              />
            ))
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Trilha de auditoria"
            subtitle="Hash de cada decisão, ancorado na rede"
          />
          {audit.loading && <p className="text-sm text-on-surface-variant">Carregando…</p>}
          {audit.data && audit.data.length === 0 && (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              Nenhum registro ancorado ainda.
            </p>
          )}
          {audit.data && audit.data.length > 0 && (
            <div className="space-y-3">
              {audit.data.map((item) => {
                const meta = statusMeta.onChain(item.status);
                return (
                  <div
                    key={item.id}
                    className="rounded border border-outline-variant/50 bg-surface-container-lowest p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {item.proposal?.title ?? item.entityType}
                      </p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <dl className="mt-2 space-y-1 font-mono text-[11px] text-on-surface-variant">
                      <div className="flex justify-between gap-2">
                        <dt>hash</dt>
                        <dd>{item.payloadHash}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>rede</dt>
                        <dd>{item.network}</dd>
                      </div>
                      {item.txSignature && (
                        <div className="flex justify-between gap-2">
                          <dt>tx</dt>
                          <dd>{truncate(item.txSignature, 14)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <dt>ancorado</dt>
                        <dd>{formatDateTime(item.anchoredAt)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <CreateProposalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        institutionId={institutionId}
        onCreated={() => {
          setCreateOpen(false);
          proposals.reload();
          audit.reload();
        }}
      />

      <ProposalDetailModal
        proposalId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={() => {
          proposals.reload();
          audit.reload();
        }}
      />
    </>
  );
}

function ProposalCard({
  proposal,
  onOpen,
  onVote,
  busy,
}: {
  proposal: Proposal;
  onOpen: () => void;
  onVote: (choice: VoteChoice) => Promise<void>;
  busy: boolean;
}) {
  const meta = statusMeta.proposal(proposal.status);
  const isOpen = proposal.status === 'OPEN';
  const approve = proposal.votes.filter((v) => v.choice === 'APPROVE').length;
  const reject = proposal.votes.filter((v) => v.choice === 'REJECT').length;
  const abstain = proposal.votes.filter((v) => v.choice === 'ABSTAIN').length;
  const total = Math.max(approve + reject + abstain, 1);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{labels.proposalTypeShort(proposal.type)}</Badge>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <h3 className="font-display text-base font-semibold text-on-surface">
            {proposal.title}
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">{proposal.description}</p>
          <p className="mt-2 font-mono text-xs text-on-surface-variant">
            por {proposal.author.name} · {statusMeta.role(proposal.author.role).label} · prazo{' '}
            {formatDate(proposal.voteDeadline)}
          </p>
        </div>
        <button
          onClick={onOpen}
          className="shrink-0 text-sm font-medium text-secondary hover:underline"
        >
          Abrir
        </button>
      </div>

      {proposal._count.votes > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-mono text-on-surface-variant">
              {proposal._count.votes} voto{proposal._count.votes === 1 ? '' : 's'}
            </span>
            <span className="font-mono text-on-surface-variant">
              {approve} a favor · {reject} contra · {abstain} abstenção
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-container">
            <div
              className="bg-success"
              style={{ width: `${(approve / total) * 100}%` }}
            />
            <div
              className="bg-error"
              style={{ width: `${(reject / total) * 100}%` }}
            />
            <div
              className="bg-outline"
              style={{ width: `${(abstain / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {isOpen && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/40 pt-4">
          <Button onClick={() => void onVote('APPROVE')} loading={busy} className="flex-1">
            A favor
          </Button>
          <Button
            variant="secondary"
            onClick={() => void onVote('REJECT')}
            loading={busy}
            className="flex-1"
          >
            Contra
          </Button>
          <Button
            variant="ghost"
            onClick={() => void onVote('ABSTAIN')}
            loading={busy}
            className="flex-1"
          >
            Abstenção
          </Button>
        </div>
      )}
    </Card>
  );
}

function CreateProposalModal({
  open,
  onClose,
  institutionId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  institutionId: string;
  onCreated: () => void;
}) {
  const [type, setType] = useState<ProposalType>('PRIORITY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(addDaysIso(14));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await governanceApi.createProposal({
        institutionId,
        type,
        title,
        description,
        voteDeadline: deadline,
      });
      setTitle('');
      setDescription('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar proposta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova proposta"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={busy} disabled={!title || !description}>
            Publicar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <label className="label" htmlFor="prop-type">
            Tipo
          </label>
          <select
            id="prop-type"
            value={type}
            onChange={(e) => setType(e.target.value as ProposalType)}
            className="input"
          >
            <option value="PRIORITY">Prioridades do fundo</option>
            <option value="FUND_PERCENTAGE">Percentual do fundo</option>
          </select>
          <p className="mt-1 text-xs text-on-surface-variant">
            Mudanças na regra de pontuação e casos individuais de bolsa não entram em votação
            popular.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="prop-title">
            Título
          </label>
          <input
            id="prop-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Ex.: Priorizar estudantes em situação de insegurança alimentar"
          />
        </div>

        <div>
          <label className="label" htmlFor="prop-desc">
            Descrição
          </label>
          <textarea
            id="prop-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input resize-none"
            placeholder="Explique o que está sendo decidido e por quê."
          />
        </div>

        <div>
          <label className="label" htmlFor="prop-deadline">
            Prazo de votação
          </label>
          <input
            id="prop-deadline"
            type="datetime-local"
            value={deadline.slice(0, 16)}
            onChange={(e) => setDeadline(new Date(e.target.value).toISOString())}
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}

function ProposalDetailModal({
  proposalId,
  onClose,
  onChanged,
}: {
  proposalId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const detail = useAsync(
    () => governanceApi.proposal(proposalId!),
    [proposalId],
    { enabled: Boolean(proposalId) },
  );
  const tally = useAsync(
    () => governanceApi.tally(proposalId!),
    [proposalId],
    { enabled: Boolean(proposalId) },
  );
  const [busy, setBusy] = useState(false);

  const proposal = detail.data;

  async function handleClose() {
    if (!proposalId) return;
    setBusy(true);
    try {
      await governanceApi.close(proposalId);
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={Boolean(proposalId)} onClose={onClose} title="Detalhe da proposta" wide>
      {detail.loading && <LoadingBlock label="Carregando proposta" />}
      {detail.error && <Alert tone="error">{detail.error}</Alert>}
      {proposal === null && !detail.loading && !detail.error && (
        <Alert tone="warning">Proposta não encontrada.</Alert>
      )}

      {proposal && (
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{labels.proposalTypeShort(proposal.type)}</Badge>
              <Badge tone={statusMeta.proposal(proposal.status).tone}>
                {statusMeta.proposal(proposal.status).label}
              </Badge>
            </div>
            <h3 className="font-display text-lg font-semibold">{proposal.title}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{proposal.description}</p>
          </div>

          {tally.data && (
            <div className="grid gap-3 sm:grid-cols-4">
              <StatCard label="A favor" value={formatNumber(tally.data.approveWeight)} tone="positive" />
              <StatCard label="Contra" value={formatNumber(tally.data.rejectWeight)} />
              <StatCard label="Abstenções" value={formatNumber(tally.data.abstain)} />
              <StatCard
                label="Resultado"
                value={tally.data.totalWeight === 0 ? 'Sem votos' : tally.data.passed ? 'Aprovada' : 'Rejeitada'}
                tone={tally.data.passed ? 'positive' : 'default'}
              />
            </div>
          )}

          {proposal.onchain && (
            <div className="rounded border border-outline-variant/60 bg-surface-container-low p-3">
              <p className="label">Registro ancorado</p>
              <dl className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt>hash</dt>
                  <dd>{proposal.onchain.payloadHash}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>status</dt>
                  <dd>{statusMeta.onChain(proposal.onchain.status).label}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>rede</dt>
                  <dd>{proposal.onchain.network}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>ancorado em</dt>
                  <dd>{formatDateTime(proposal.onchain.anchoredAt)}</dd>
                </div>
              </dl>
            </div>
          )}

          {proposal.votes.length > 0 && (
            <div>
              <p className="label">Votos registrados</p>
              <div className="space-y-1.5">
                {proposal.votes.map((vote) => {
                  const meta = statusMeta.vote(vote.choice);
                  return (
                    <div
                      key={vote.id}
                      className="flex items-center justify-between gap-3 border-b border-outline-variant/30 py-1.5 text-sm last:border-0"
                    >
                      <div>
                        <p className="font-medium">{vote.voter.name}</p>
                        <p className="font-mono text-xs text-on-surface-variant">
                          {statusMeta.role(vote.voter.role).label} · peso {vote.weight}
                        </p>
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {proposal.status === 'OPEN' && (
            <Button onClick={handleClose} loading={busy} className="w-full">
              Encerrar votação e ancorar decisão
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}