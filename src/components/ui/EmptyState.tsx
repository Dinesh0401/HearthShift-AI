import React from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <Card className={`p-8 sm:p-10 text-center ${className}`}>
    <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto mb-3.5">
      {icon}
    </div>
    <h3 className="text-sm sm:text-base font-semibold text-zinc-900">{title}</h3>
    <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {action && <div className="mt-5 flex items-center justify-center gap-2.5">{action}</div>}
  </Card>
);
