'use client';

import React from 'react';
import type { SystemCapabilityMode } from '../../core/capabilities/policy';

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
  const config = {
    BASIC: {
      label: 'BASIC MODE',
      tamilLabel: 'அடிப்படை முறைமை',
      colorBg: 'bg-amber-100 dark:bg-amber-950/40',
      colorText: 'text-amber-800 dark:text-amber-300',
      colorBorder: 'border-amber-300 dark:border-amber-800',
      icon: '📊',
      description: 'Monthly utility bills only. Slab tracking active. Hourly load-shifting is strictly disabled.',
    },
    INTERVAL: {
      label: 'INTERVAL MODE',
      tamilLabel: 'கால இடைவெளி முறைமை',
      colorBg: 'bg-blue-100 dark:bg-blue-950/40',
      colorText: 'text-blue-800 dark:text-blue-300',
      colorBorder: 'border-blue-300 dark:border-blue-800',
      icon: '📈',
      description: 'Interval smart-meter data validated. Time-series charts & night standby baseline unlocked.',
    },
    OPTIMIZATION_ELIGIBLE: {
      label: 'OPTIMIZATION ELIGIBLE',
      tamilLabel: 'மேம்படுத்தல் தயார்',
      colorBg: 'bg-emerald-100 dark:bg-emerald-950/40',
      colorText: 'text-emerald-800 dark:text-emerald-300',
      colorBorder: 'border-emerald-300 dark:border-emerald-800',
      icon: '⚡',
      description: '7+ days of interval data and comfort constraints confirmed. SPARE-HEM decision assistant active.',
    },
  }[mode];

  return (
    <div
      className={`inline-flex flex-col rounded-xl border p-4 transition-all ${config.colorBg} ${config.colorBorder} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{config.icon}</span>
        <div>
          <span className={`text-xs font-bold tracking-wider uppercase ${config.colorText}`}>
            {config.label}
          </span>
          <span className="ml-2 text-xs opacity-75">
            ({config.tamilLabel})
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
        {config.description}
      </p>

      {reasons.length > 0 && (
        <ul className="mt-2 list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      {nextStepGuidance && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-gray-200">
          💡 Next step: {nextStepGuidance}
        </div>
      )}
    </div>
  );
};
