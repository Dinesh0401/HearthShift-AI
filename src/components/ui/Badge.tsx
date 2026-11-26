import React from 'react';

export type BadgeVariant = 'neutral' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  purple: 'bg-violet-50 text-violet-800 border-violet-200',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-zinc-500',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-600',
  rose: 'bg-rose-600',
  blue: 'bg-sky-600',
  purple: 'bg-violet-600',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${VARIANT_CLASSES[variant]} ${className}`}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASSES[variant]}`} aria-hidden="true" />}
    {children}
  </span>
);
