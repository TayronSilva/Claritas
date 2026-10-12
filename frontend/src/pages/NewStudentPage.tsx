import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentsApi } from '../api';
import type { StudentStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Alert, PageHeader } from '../components/Layout';
import { Button } from '../components/Button';
import { Card, CardHeader } from '../components/Card';
import { options, statusMeta } from '../lib/labels';
import { ApiError } from '../api/client';
import { formatCurrency } from '../lib/format';

const COURSES = [
  'Administração',
  'Direito',
  'Engenharia de Software',
  'Pedagogia',
  'Ciência de Dados',
  'Medicina',
  'Biomedicina',
  'Enfermagem',
];

export function NewStudentPage() {
  const { institution } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState(COURSES[0]);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [status, setStatus] = useState<StudentStatus>('ACTIVE');
  const [monthlyFee, setMonthlyFee] = useState('1000');
  const [intakeYear, setIntakeYear] = useState(String(new Date().getFullYear()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!institution) return;
    setSaving(true);
    setError(null);
    try {
      await studentsApi.create({
        institutionId: institution.id,
        fullName,
        email: email || undefined,
        course,
        enrollmentCode: enrollmentCode || undefined,
        status,
        monthlyFee: Number(monthlyFee),
        intakeYear: Number(intakeYear),
      });
      navigate('/alunos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar aluno');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Novo aluno"
        description="Cadastre manualmente os dados acadêmicos e financeiros do aluno."
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader title="Identificação" subtitle="Dados pessoais para registro acadêmico" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="fullName">
                Nome completo *
              </label>
              <input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="email">
                E-mail institucional / pessoal
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="enrollment">
                Matrícula
              </label>
              <input
                id="enrollment"
                value={enrollmentCode}
                onChange={(e) => setEnrollmentCode(e.target.value)}
                placeholder="Gerar automático"
                className="input"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Vínculo acadêmico" subtitle="Polo, curso e regime curricular" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="course">
                Curso *
              </label>
              <select
                id="course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="input"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">
                Status inicial *
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                className="input"
              >
                {options.studentStatus.map((s) => (
                  <option key={s} value={s}>
                    {statusMeta.student(s).label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="intakeYear">
                Ano de ingresso
              </label>
              <input
                id="intakeYear"
                type="number"
                value={intakeYear}
                onChange={(e) => setIntakeYear(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Financeiro"
            subtitle="Mensalidade do aluno antes da aplicação de bolsas"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="monthlyFee">
                Mensalidade base (R$) *
              </label>
              <input
                id="monthlyFee"
                type="number"
                min={0}
                step="0.01"
                required
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <p className="text-sm text-on-surface-variant">
                Valor de referência: {formatCurrency(Number(monthlyFee) || 0)} / mês
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/alunos')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={!institution}>
            Salvar aluno
          </Button>
        </div>
      </form>
    </>
  );
}
