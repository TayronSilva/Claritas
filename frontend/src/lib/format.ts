/**
 * O Prisma serializa Decimal como string. Todo valor monetário chega como
 * string e precisa ser convertido antes de qualquer operação numérica.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFmt = new Intl.NumberFormat('pt-BR');

export function formatCurrency(value: string | number | null | undefined): string {
  return brl.format(toNumber(value));
}

export function formatCurrencyCompact(value: string | number | null | undefined): string {
  const num = toNumber(value);
  return Math.abs(num) >= 10000 ? brlCompact.format(num) : brl.format(num);
}

export function formatNumber(value: number | null | undefined): string {
  return numberFmt.format(value ?? 0);
}

export function formatPercent(value: string | number | null | undefined, decimals = 1): string {
  return `${toNumber(value).toFixed(decimals).replace('.', ',')}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPeriod(period: string | null | undefined): string {
  if (!period) return '—';
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];
  const index = Number(month) - 1;
  return `${months[index] ?? month}/${year}`;
}

export function truncate(value: string | null | undefined, size = 6): string {
  if (!value) return '—';
  return value.length <= size ? value : `${value.slice(0, size)}…`;
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}