'use client';

import React from 'react';
import { useLanguage } from '../../locales/i18n';
import { calculateBill } from '../../core/tariff/calculator';
import { TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import { detectTariffCliffThreshold } from '../../core/simulation/scenario-engine';
import type { TariffPlan } from '../../core/tariff/types';
import { AlertTriangle, CheckCircle2, Info, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { ExpandableDetails } from '../ui/Disclosure';

interface TariffHeadroomCardProps {
  latestUnitsKwh?: number;
  tariff?: TariffPlan;
  className?: string;
}

export const TariffHeadroomCard: React.FC<TariffHeadroomCardProps> = ({
  latestUnitsKwh = 380,
  tariff = TNPDCL_LT1A_2026_MAY10,
  className = '',
}) => {
  const { t, language } = useLanguage();

  const currentUnits = Math.max(0, latestUnitsKwh);
  const currentBill = calculateBill(currentUnits, tariff);
  const cliffThreshold = detectTariffCliffThreshold(tariff);

  if (cliffThreshold !== null) {
    const billAtCliff = calculateBill(cliffThreshold, tariff);
    const billPastCliff = calculateBill(cliffThreshold + 1, tariff);
    const cliffCostIncrease = (billPastCliff.net_payable_paise - billAtCliff.net_payable_paise) / 100;

    const freeRule = tariff.subsidy_scheme?.rules.find((r) => r.type === 'free_units');
    const freeUnitsCount = freeRule?.free_units_count ?? 100;

    const nearThreshold = Math.round(cliffThreshold * 0.84);
    const isNearCliff = currentUnits > nearThreshold && currentUnits <= cliffThreshold;
    const hasExceededCliff = currentUnits > cliffThreshold;
    const headroomUnits = Math.max(0, cliffThreshold - currentUnits);
    const progressScaleMax = Math.round(cliffThreshold * 1.2);

    const remainingText = hasExceededCliff
      ? language === 'ta'
        ? `${currentUnits - cliffThreshold} kWh அதிகம் (> ${cliffThreshold})`
        : `${currentUnits - cliffThreshold} kWh over threshold`
      : language === 'ta'
      ? `எல்லைக்குள் ${headroomUnits} kWh மீதம்`
      : `${headroomUnits} kWh under threshold`;

    return (
      <Card className={`p-5 sm:p-6 ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-zinc-500">{t('activeTariff')}</span>
            <h3 className="text-base font-semibold text-zinc-900 mt-0.5">{tariff.name}</h3>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-500 block">{t('currentCycleUnits')}</span>
            <span className="text-2xl font-semibold text-zinc-900 tabular-nums">
              {currentUnits} <span className="text-sm font-normal text-zinc-400">kWh</span>
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-zinc-600">{freeUnitsCount} free units when ≤ {cliffThreshold} kWh</span>
            <span
              className={`font-medium tabular-nums ${
                hasExceededCliff
                  ? 'text-rose-700'
                  : isNearCliff
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {remainingText}
            </span>
          </div>

          <div
            className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.min(progressScaleMax, currentUnits)}
            aria-valuemin={0}
            aria-valuemax={progressScaleMax}
            aria-label={`Consumption headroom relative to ${cliffThreshold} kWh tariff cliff`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hasExceededCliff
                  ? 'bg-rose-500'
                  : isNearCliff
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, (currentUnits / progressScaleMax) * 100)}%` }}
            />
          </div>
        </div>

        {(isNearCliff || hasExceededCliff) && cliffCostIncrease > 25 ? (
          <div
            className={`mt-4 rounded-xl border p-3.5 flex items-start gap-2.5 text-xs ${
              hasExceededCliff
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('cliffWarningTitle')}</p>
              <p className="mt-0.5 text-zinc-700">{t('cliffWarningText')}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('subsidyEligibility')}</span>
          </div>
        )}

        <ExpandableDetails summary={t('calculationDetails')} className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-50 border border-zinc-200/70 p-2.5 rounded-xl">
              <span className="text-zinc-500 block">{t('overviewEstimatedBillLabel')}</span>
              <span className="font-semibold text-sm text-zinc-900 tabular-nums">
                ₹{(currentBill.net_payable_paise / 100).toFixed(2)}
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200/70 p-2.5 rounded-xl">
              <span className="text-zinc-500 block">{cliffThreshold} kWh</span>
              <span className="font-semibold text-sm text-emerald-700 tabular-nums">
                ₹{(billAtCliff.net_payable_paise / 100).toFixed(2)}
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200/70 p-2.5 rounded-xl">
              <span className="text-zinc-500 block">{cliffThreshold + 1} kWh</span>
              <span className="font-semibold text-sm text-rose-700 tabular-nums">
                ₹{(billPastCliff.net_payable_paise / 100).toFixed(2)}
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200/70 p-2.5 rounded-xl">
              <span className="text-zinc-500 block">Cliff delta</span>
              <span className="font-semibold text-sm text-rose-700 tabular-nums">
                +₹{cliffCostIncrease.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-zinc-500">
            {tariff.subsidy_scheme?.name ?? tariff.tariff_order_ref}
          </p>
        </ExpandableDetails>
      </Card>
    );
  }

  // Non-cliff tariff view (Flat or Time-of-Use)
  const isTou = tariff.gross_tariff.type === 'time_of_use';
  const touBands = tariff.gross_tariff.type === 'time_of_use' ? tariff.gross_tariff.time_bands : [];
  const flatRateInr =
    tariff.gross_tariff.type === 'flat' ? (tariff.gross_tariff.rate_paise / 100).toFixed(2) : null;
  const fixedMonthlyInr = ((tariff.fixed_charges?.monthly_amount_paise ?? 0) / 100).toFixed(2);
  const dutyPct = ((tariff.electricity_duty?.percentage ?? 0) * 100).toFixed(0);

  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-zinc-500">{t('activeTariff')}</span>
          <h3 className="text-base font-semibold text-zinc-900 mt-0.5">{tariff.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {tariff.utility_name} · {tariff.billing_cadence}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-zinc-500 block">{t('currentCycleUnits')}</span>
          <span className="text-2xl font-semibold text-zinc-900 tabular-nums">
            {currentUnits} <span className="text-sm font-normal text-zinc-400">kWh</span>
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
          {isTou ? (
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          <span>
            {isTou
              ? language === 'ta'
                ? 'நேர அடிப்படையிலான (TOU) கட்டணம் — மானிய எல்லை உயர்வு இல்லை'
                : 'Time-of-Use (TOU) tariff — no subsidy threshold jump; time-shifting can lower costs'
              : language === 'ta'
              ? 'நிலையான கட்டணம் — மானிய எல்லை உயர்வு இல்லை'
              : 'Flat rate reference tariff — no subsidy threshold jump'}
          </span>
        </div>

        {isTou && touBands.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {touBands.map((band) => (
              <div
                key={`${band.label}-${band.start_hour}`}
                className="rounded-xl bg-white border border-zinc-200 px-3 py-2 text-xs"
              >
                <span className="block font-medium text-zinc-900">{band.label}</span>
                <span className="block text-[11px] text-zinc-500 tabular-nums">
                  {String(band.start_hour).padStart(2, '0')}:00–
                  {String(band.end_hour).padStart(2, '0')}:00
                </span>
                <span className="block font-semibold text-emerald-700 mt-0.5 tabular-nums">
                  ₹{(band.rate_paise / 100).toFixed(2)}/kWh
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            {flatRateInr
              ? `Rate: ₹${flatRateInr}/kWh · Fixed charge: ₹${fixedMonthlyInr}/month · Duty: ${dutyPct}%`
              : 'Linear tariff without slab discontinuities.'}
          </p>
        )}
      </div>

      <ExpandableDetails summary={t('calculationDetails')} className="mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-50 border border-zinc-200/70 p-2.5 rounded-xl">
            <span className="text-zinc-500 block">{t('overviewEstimatedBillLabel')}</span>
            <span className="font-semibold text-sm text-zinc-900 tabular-nums">
              ₹{(currentBill.net_payable_paise / 100).toFixed(2)}
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/70 p-2.5 rounded-xl">
            <span className="text-zinc-500 block">Marginal rate</span>
            <span className="font-semibold text-sm text-emerald-700 tabular-nums">
              ₹{currentBill.marginal_rate_next_unit.toFixed(2)}/kWh
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/70 p-2.5 rounded-xl">
            <span className="text-zinc-500 block">Tariff type</span>
            <span className="font-semibold text-sm text-zinc-800">
              {isTou ? 'Time-of-Use' : 'Flat'}
            </span>
          </div>
        </div>
      </ExpandableDetails>
    </Card>
  );
};
