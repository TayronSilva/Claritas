import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { institutionsApi } from '../api';
import type { InstitutionStatus } from '../api/types';
import { Alert, PageHeader } from '../components/Layout';
import { Button } from '../components/Button';
import { Card, CardHeader } from '../components/Card';
import { statusMeta } from '../lib/labels';
import { ApiError } from '../api/client';

export function NewUnitPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<InstitutionStatus>('PILOT');
  const [fundSharePct, setFundSharePct] = useState('30');
  const [treasuryPub, setTreasuryPub] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await institutionsApi.create({
        name,
        slug: slug || undefined,
        status,
        fundSharePct: Number(fundSharePct),
        treasuryPub: treasuryPub || undefined,
      });
      navigate('/unidades');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar unidade');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Nova unidade"
        description="Cadastre os dados da nova operação escolar e parametrizações operacionais."
        actions={
          <Button variant="ghost" onClick={() => navigate('/unidades')}>
            Voltar para unidades
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader title="Identificação" subtitle="Nome, código e status inicial" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Nome da unidade *
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="slug">
                Código interno (slug)
              </label>
              <input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Gerado automaticamente"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="status">
                Status inicial
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as InstitutionStatus)}
                className="input"
              >
                {['PILOT', 'ACTIVE', 'SUSPENDED'].map((s) => (
                  <option key={s} value={s}>
                    {statusMeta.institution(s as InstitutionStatus).label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fundShare">
                Fundo de permanência (%)
              </label>
              <input
                id="fundShare"
                type="number"
                min={0}
                max={100}
                value={fundSharePct}
                onChange={(e) => setFundSharePct(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Operação & Liquidação" subtitle="Carteira de recebimento na rede Solana" />
          <div>
            <label className="label" htmlFor="treasury">
              Carteira de recebimento (public key)
            </label>
            <input
              id="treasury"
              value={treasuryPub}
              onChange={(e) => setTreasuryPub(e.target.value)}
              placeholder="Opcional"
              className="input font-mono text-sm"
            />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/unidades')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar unidade
          </Button>
        </div>
      </form>
    </>
  );
}
