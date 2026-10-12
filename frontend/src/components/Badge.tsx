type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'accent';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant border-outline-variant/70',
  info: 'bg-secondary-container/40 text-secondary border-secondary/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-tertiary-container/20 text-tertiary-on-container border-tertiary/25',
  error: 'bg-error-container/50 text-error border-error/25',
  accent: 'bg-primary-container/15 text-primary-container border-primary/20',
};

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 font-mono text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}