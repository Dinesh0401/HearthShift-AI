'use client';

import React from 'react';
import { useLanguage } from '../../locales/i18n';
import { calculateBill } from '../../core/tariff/calculator';
import { TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import { AlertTriangle, Info, ArrowUpRight } from 'lucide-react';

interface TariffHeadroomCardProps {
  latestUnitsKwh?: number;
  className?: string;
}

export const TariffHeadroomCard: React.FC<TariffHeadroomCardProps> = ({
  latestUnitsKwh = 380,
  className = '',
}) => {
  const { t } = useLanguage();

  // Deterministically compute cliff calculations
  const bill500 = calculateBill(500, TNPDCL_LT1A_2026_MAY10);
  const bill501 = calculateBill(501, TNPDCL_LT1A_2026_MAY10);
  const cliffCostIncrease = (bill501.net_payable_paise - bill500.net_payable_paise) / 100;

  // Compute for current household consumption
  const currentUnits = Math.max(0, latestUnitsKwh);
  const currentBill = calculateBill(currentUnits, TNPDCL_LT1A_2026_MAY10);
  const isNearCliff = currentUnits > 420 && currentUnits <= 500;
  const hasExceededCliff = currentUnits > 500;
  const headroomUnits = Math.max(0, 500 - currentUnits);

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t('activeTariff')}
          </span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            TNPDCL LT-1A (2026 Scheme)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('subsidyStatus')}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 dark:text-gray-400 block">
            {t('currentCycleUnits')}
          </span>
          <span className="text-2xl font-black text-gray-900 dark:text-gray-50">
            {currentUnits} <span className="text-sm font-normal text-gray-500">kWh</span>
          </span>
        </div>
      </div>

      {/* 500 Units Headroom Progress Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            {t('subsidyEligibility')}
          </span>
          <span className={hasExceededCliff ? 'text-red-600 font-bold' : isNearCliff ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
            {hasExceededCliff ? (
              'Disqualified (> 500 kWh)'
            ) : (
              `${headroomUnits} ${t('unitsRemaining')}`
            )}
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              hasExceededCliff
                ? 'bg-red-500'
                : isNearCliff
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, (currentUnits / 600) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-gray-400">
          <span>0 kWh (100% Free)</span>
          <span className="font-semibold text-emerald-600">200 kWh (Free Tier)</span>
          <span className="font-bold text-red-500">500 kWh (Cliff Edge)</span>
          <span>600+ kWh</span>
        </div>
      </div>

      {/* Cliff Warning Banner */}
      {(isNearCliff || hasExceededCliff) && (
        <div className={`mt-5 rounded-xl border p-4 flex gap-3 ${
          hasExceededCliff
            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
        }`}>
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold">
              {t('cliffWarningTitle')}
            </h4>
            <p className="leading-relaxed">
              {t('cliffWarningText')}
            </p>
          </div>
        </div>
      )}

      {/* Deterministic Slab Metric Badges */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 block">Current Bill</span>
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
            ₹{(currentBill.net_payable_paise / 100).toFixed(2)}
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 block">Bill at 500 units</span>
          <span className="font-bold text-sm text-emerald-600">
            ₹{(bill500.net_payable_paise / 100).toFixed(2)}
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 block">Bill at 501 units</span>
          <span className="font-bold text-sm text-red-500">
            ₹{(bill501.net_payable_paise / 100).toFixed(2)}
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 block">Cliff Cost Delta</span>
          <span className="font-bold text-sm text-red-600 flex items-center gap-0.5">
            +₹{cliffCostIncrease.toFixed(2)}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
