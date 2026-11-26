import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
  >
    {children}
  </div>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-zinc-500 mt-0.5 leading-snug">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  helper?: React.ReactNode;
  badge?: React.ReactNode;
  accent?: 'default' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  helper,
  badge,
  accent = 'default',
  className = '',
}) => {
  const valueTone = {
    default: 'text-zinc-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  }[accent];

  return (
    <Card className={`p-5 sm:p-6 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        {badge}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums ${valueTone}`}>
          {value}
        </span>
        {unit && <span className="text-base font-medium text-zinc-400">{unit}</span>}
      </div>
      {helper && <div className="mt-2.5 text-xs text-zinc-500 leading-relaxed">{helper}</div>}
    </Card>
  );
};
