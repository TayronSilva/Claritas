import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-container disabled:bg-surface-container-highest disabled:text-outline',
  secondary:
    'bg-secondary-container/50 text-secondary border border-secondary/30 hover:bg-secondary-container/80',
  ghost:
    'bg-transparent text-on-surface-variant border border-outline-variant hover:bg-surface-container',
  danger: 'bg-error text-white hover:bg-error/90',
};

export function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="font-display text-sm font-medium text-on-surface">{title}</p>
      {description && <p className="max-w-sm text-sm text-on-surface-variant">{description}</p>}
    </div>
  );
}