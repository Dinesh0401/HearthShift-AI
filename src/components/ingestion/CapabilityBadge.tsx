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
    <Card className={`p-4 ${className}`} aria-live="polite">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-zinc-500">
          <span className="shrink-0">{current.icon}</span>
          <span className="text-[11px] font-medium">{t('capabilityStatus')}</span>
        </div>

        <Badge variant={current.variant} dot className="w-fit">
          {current.label}
        </Badge>
      </div>

      <p className="mt-2.5 text-xs text-zinc-600 leading-relaxed">{current.desc}</p>

      {(reasons.length > 0 || nextStepGuidance) && (
        <ExpandableDetails summary={t('viewDetails')} className="mt-2.5">
          {reasons.length > 0 && (
            <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-600">
              {reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          )}
          {nextStepGuidance && (
            <p className="mt-2 text-xs font-medium text-zinc-800">{nextStepGuidance}</p>
          )}
        </ExpandableDetails>
      )}
    </Card>
  );
};
