'use client';

import React from 'react';
import { useLanguage } from '../../locales/i18n';
import { calculateBill } from '../../core/tariff/calculator';
import { TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import { detectTariffCliffThreshold } from '../../core/simulation/scenario-engine';
import type { TariffPlan } from '../../core/tariff/types';
import { AlertTriangle, Info, ArrowUpRight, Clock } from 'lucide-react';

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

    const eligibilityText =
      language === 'ta'
        ? `இரு மாத நுகர்வு ≤ ${cliffThreshold} யூனிட்களுக்கு ${freeUnitsCount} இலவச யூனிட் தகுதி`
        : `Eligible for ${freeUnitsCount} free units when consumption ≤ ${cliffThreshold} units (${tariff.billing_cadence})`;

    const remainingText = hasExceededCliff
      ? language === 'ta'
        ? `தகுதியற்றது (> ${cliffThreshold} kWh)`
        : `Disqualified (> ${cliffThreshold} kWh)`
      : language === 'ta'
      ? `₹${cliffCostIncrease.toFixed(2)} கட்டண உயர்வுக்கு முன் ${headroomUnits} யூனிட்டுகள் மீதமுள்ளன`
      : `${headroomUnits} units remaining before ₹${cliffCostIncrease.toFixed(2)} subsidy cliff`;

    const dynamicCliffWarning =
      language === 'ta'
        ? `${cliffThreshold} யூனிட்டுக்கு பதிலாக ${cliffThreshold + 1} யூனிட் பயன்படுத்தினால் மானியத் தகுதி குறைந்து ஒரே ஒரு கூடுதல் யூனிட்டுக்காக கட்டணம் ₹${cliffCostIncrease.toFixed(2)} உயரும் (₹${(billAtCliff.net_payable_paise / 100).toFixed(2)} → ₹${(billPastCliff.net_payable_paise / 100).toFixed(2)})!`
        : `Consuming ${cliffThreshold + 1} units instead of ${cliffThreshold} units crosses the subsidy cliff, jumping your bill by ₹${cliffCostIncrease.toFixed(2)} (₹${(billAtCliff.net_payable_paise / 100).toFixed(2)} → ₹${(billPastCliff.net_payable_paise / 100).toFixed(2)}) for just ONE extra unit!`;

    return (
      <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t('activeTariff')}
            </span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {tariff.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {tariff.subsidy_scheme?.name ?? tariff.tariff_order_ref}
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

        {/* Cliff Headroom Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              {eligibilityText}
            </span>
            <span className={hasExceededCliff ? 'text-red-600 font-bold' : isNearCliff ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
              {remainingText}
            </span>
          </div>

          <div
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden p-0.5"
            role="progressbar"
            aria-valuenow={Math.min(progressScaleMax, currentUnits)}
            aria-valuemin={0}
            aria-valuemax={progressScaleMax}
            aria-label={`Consumption headroom relative to ${cliffThreshold} kWh tariff cliff`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hasExceededCliff
                  ? 'bg-red-500'
                  : isNearCliff
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (currentUnits / progressScaleMax) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>0 kWh (Free)</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {freeUnitsCount} kWh (Free Tier)
            </span>
            <span className="font-bold text-red-600 dark:text-red-400">
              {cliffThreshold} kWh (Cliff Edge)
            </span>
            <span>{progressScaleMax}+ kWh</span>
          </div>
        </div>

        {/* Cliff Warning Banner */}
        {(isNearCliff || hasExceededCliff) && cliffCostIncrease > 25 && (
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
                {dynamicCliffWarning}
              </p>
            </div>
          </div>
        )}

        {/* Deterministic Slab Metric Badges */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
          <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
            <span className="text-gray-500 dark:text-gray-400 block">Modeled Current Bill</span>
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
              ₹{(currentBill.net_payable_paise / 100).toFixed(2)}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
            <span className="text-gray-500 dark:text-gray-400 block">Bill at {cliffThreshold} units</span>
            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
              ₹{(billAtCliff.net_payable_paise / 100).toFixed(2)}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
            <span className="text-gray-500 dark:text-gray-400 block">Bill at {cliffThreshold + 1} units</span>
            <span className="font-bold text-sm text-red-600 dark:text-red-400">
              ₹{(billPastCliff.net_payable_paise / 100).toFixed(2)}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
            <span className="text-gray-500 dark:text-gray-400 block">Cliff Cost Delta</span>
            <span className="font-bold text-sm text-red-600 dark:text-red-400 flex items-center gap-0.5">
              +₹{cliffCostIncrease.toFixed(2)}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
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
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t('activeTariff')}
          </span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {tariff.name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tariff.utility_name} · {tariff.billing_cadence} · {tariff.tariff_order_ref}
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

      {/* Tariff Structure Metadata */}
      <div className="mt-5 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
          {isTou ? <Clock className="w-4 h-4 text-blue-600 shrink-0" /> : <Info className="w-4 h-4 text-blue-600 shrink-0" />}
          <span>
            {isTou
              ? language === 'ta'
                ? 'நேர அடிப்படையிலான (TOU) கட்டணம் — மானிய எல்லைக் கட்டண உயர்வு இல்லை'
                : 'Time-of-Use (TOU) Tariff — No Subsidy Cliff; Time-Shifting Saves Money'
              : language === 'ta'
              ? 'நிலையான கட்டண அட்டவணை — மானிய எல்லைக் கட்டண உயர்வு இல்லை'
              : 'Flat Rate Reference Tariff — No Subsidy Cliff or TOU Differentials'}
          </span>
        </div>

        {isTou && touBands.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {touBands.map((band) => (
              <div
                key={`${band.label}-${band.start_hour}`}
                className="rounded-lg bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/60 px-2.5 py-2 text-xs"
              >
                <span className="block font-semibold text-gray-800 dark:text-gray-200">
                  {band.label}
                </span>
                <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                  {String(band.start_hour).padStart(2, '0')}:00–{String(band.end_hour).padStart(2, '0')}:00
                </span>
                <span className="block font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                  ₹{(band.rate_paise / 100).toFixed(2)}/kWh
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-blue-800 dark:text-blue-300">
            {flatRateInr
              ? `Base energy rate: ₹${flatRateInr}/kWh · Fixed monthly charge: ₹${fixedMonthlyInr} · Electricity duty: ${dutyPct}% on energy charges.`
              : 'Standard linear billing without subsidy cliff discontinuities.'}
          </p>
        )}
      </div>

      {/* Deterministic Metric Badges */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 dark:text-gray-400 block">Estimated Cycle Charge</span>
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
            ₹{(currentBill.net_payable_paise / 100).toFixed(2)}
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 dark:text-gray-400 block">Next Unit Marginal Rate</span>
          <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
            ₹{currentBill.marginal_rate_next_unit.toFixed(2)}/kWh
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 dark:text-gray-400 block">Billing Cadence</span>
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100 capitalize">
            {tariff.billing_cadence}
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
          <span className="text-gray-500 dark:text-gray-400 block">Tariff Type</span>
          <span className="font-bold text-sm text-blue-700 dark:text-blue-300">
            {isTou ? 'TOU (Time-Aware)' : 'Flat (No Cliff)'}
          </span>
        </div>
      </div>
    </div>
  );
};
