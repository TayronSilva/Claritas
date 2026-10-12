export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[32px] font-semibold leading-10 text-on-surface">
          {title}
        </h1>
        {description && <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-success'
      : tone === 'negative'
        ? 'text-error'
        : 'text-on-surface';

  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className={`mt-1.5 font-display text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
}) {
  const map = {
    info: 'border-secondary/30 bg-secondary-container/30 text-secondary',
    warning: 'border-tertiary/30 bg-tertiary-container/15 text-tertiary-on-container',
    error: 'border-error/30 bg-error-container/40 text-error',
    success: 'border-success/30 bg-success/10 text-success',
  } as const;

  return (
    <div className={`rounded border px-4 py-3 text-sm ${map[tone]}`}>
      {title && <p className="font-display font-semibold">{title}</p>}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}

export function LoadingBlock({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-on-surface-variant">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-error/30 bg-error-container/30 p-6 text-center">
      <p className="font-display text-sm font-semibold text-error">Não foi possível carregar</p>
      <p className="mt-1 text-sm text-on-surface-variant">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded border border-error/30 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/60"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}