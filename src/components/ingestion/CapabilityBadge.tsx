'use client';

import React from 'react';
import type { SystemCapabilityMode } from '../../core/capabilities/policy';
import { useLanguage } from '../../locales/i18n';
import { Receipt, Activity, CheckCircle2 } from 'lucide-react';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ExpandableDetails } from '../ui/Disclosure';

interface CapabilityBadgeProps {
  mode: SystemCapabilityMode;
  reasons?: string[];
  nextStepGuidance?: string;
  className?: string;
}

export const CapabilityBadge: React.FC<CapabilityBadgeProps> = ({
  mode,
  reasons = [],
  nextStepGuidance,
  className = '',
}) => {
  const { t } = useLanguage();

  const meta: Record<
    SystemCapabilityMode,
    { label: string; desc: string; variant: BadgeVariant; icon: React.ReactNode }
  > = {
    BASIC: {
      label: t('modeBasicLabel'),
      desc: t('modeBasicDesc'),
      variant: 'amber',
      icon: <Receipt className="w-4 h-4 text-amber-600" />,
    },
    INTERVAL: {
      label: t('modeIntervalLabel'),
      desc: t('modeIntervalDesc'),
      variant: 'blue',
      icon: <Activity className="w-4 h-4 text-sky-600" />,
    },
    OPTIMIZATION_ELIGIBLE: {
      label: t('modeReadyLabel'),
      desc: t('modeReadyDesc'),
      variant: 'emerald',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    },
  };

  const current = meta[mode];

  return (
    <Card className={`p-5 ${className}`} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            {current.icon}
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-500 block">
              {t('capabilityStatus')}
            </span>
            <span className="text-sm font-semibold text-zinc-900">{current.label}</span>
          </div>
        </div>
        <Badge variant={current.variant} dot>
          {current.label}
        </Badge>
      </div>

      <p className="mt-3 text-xs text-zinc-600 leading-relaxed">{current.desc}</p>

      {(reasons.length > 0 || nextStepGuidance) && (
        <ExpandableDetails summary={t('viewDetails')} className="mt-3">
          {reasons.length > 0 && (
            <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-600">
              {reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          )}
          {nextStepGuidance && (
            <p className="mt-2.5 text-xs font-medium text-zinc-800">{nextStepGuidance}</p>
          )}
        </ExpandableDetails>
      )}
    </Card>
  );
};
