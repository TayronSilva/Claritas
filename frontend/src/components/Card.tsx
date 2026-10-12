import { type ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-outline-variant/60 bg-surface-container-lowest ${
        padded ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="font-display text-base font-semibold text-on-surface">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}