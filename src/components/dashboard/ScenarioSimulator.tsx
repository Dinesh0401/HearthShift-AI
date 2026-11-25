'use client';

import React, { useState, useMemo } from 'react';
import { TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import type { TariffPlan } from '../../core/tariff/types';
import { calculateScenarioOutcome, type ScenarioActionSelection } from '../../core/simulation/scenario-engine';
import { useLanguage } from '../../locales/i18n';
import { Sliders, Zap, Info, Sparkles } from 'lucide-react';

interface ScenarioSimulatorProps {
  baselineUnitsKwh: number;
  tariff?: TariffPlan;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  baselineUnitsKwh,
  tariff = TNPDCL_LT1A_2026_MAY10,
}) => {
  const { t, language } = useLanguage();

  const [selections, setSelections] = useState<ScenarioActionSelection>({
    acSetpointDelta: 0.5,
    curtailAcHours: 0,
    trimWaterHeaterMinutes: 0,
    powerDownStandby: true,
    shiftLaundryToMorning: false,
  });

  const outcome = useMemo(() => {
    return calculateScenarioOutcome(baselineUnitsKwh, selections, tariff);
  }, [baselineUnitsKwh, selections, tariff]);

  const laundryHelperText = tariff.is_time_dependent
    ? language === 'ta'
      ? 'TOU கட்டணத்தில் மாலை உச்ச நேரத்திலிருந்து (19:00) காலை நேரத்திற்கு (07:00) மாற்றுவது மாதிரி சேமிப்பைத் தரும்'
      : 'Under active Time-of-Use tariff, shifting 24 kWh from evening peak (19:00) to morning (07:00) yields modeled cost savings'
    : language === 'ta'
    ? 'நிலையான/அடுக்கு கட்டணத்தில் நேர மாற்றத்தால் நேரடி சேமிப்பு ₹0'
    : 'Under flat/tiered tariff, shifting timing yields ₹0 direct savings';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('simulatorTitle')}</h2>
              <p className="text-xs text-gray-600 mt-0.5">{t('simulatorSubtitle')}</p>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {tariff.name}
          </span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Action Control Panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Action 1: AC Setpoint */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                {t('acThermostat')}
              </span>
              <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                +{selections.acSetpointDelta}°C
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="AC thermostat setpoint delta">
              {([0, 0.5, 1.0, 2.0] as const).map((delta) => (
                <button
                  key={delta}
                  type="button"
                  aria-pressed={selections.acSetpointDelta === delta}
                  onClick={() => setSelections((prev) => ({ ...prev, acSetpointDelta: delta }))}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    selections.acSetpointDelta === delta
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {delta === 0 ? '0°C (Off)' : `+${delta}°C`}
                </button>
              ))}
            </div>
          </div>

          {/* Action 2: AC Runtime Curtailment */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('acRuntimeCurtail')}</p>
              <p className="text-xs text-gray-500 mt-0.5">Switch AC off 1h early; room retains cool air (~90 kWh/period)</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={selections.curtailAcHours === 1}
              aria-label="Curtail AC runtime by 1 hour daily"
              onClick={() =>
                setSelections((prev) => ({ ...prev, curtailAcHours: prev.curtailAcHours === 1 ? 0 : 1 }))
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                selections.curtailAcHours === 1 ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  selections.curtailAcHours === 1 ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action 3: Water Heater Trim */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('waterHeaterTimer')}</p>
              <p className="text-xs text-gray-500 mt-0.5">Trim immersion/geyser runtime once warm (~20 kWh/period)</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={selections.trimWaterHeaterMinutes > 0}
              aria-label="Trim water heater duration by 15 to 20 minutes"
              onClick={() =>
                setSelections((prev) => ({
                  ...prev,
                  trimWaterHeaterMinutes: prev.trimWaterHeaterMinutes > 0 ? 0 : 20,
                }))
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                selections.trimWaterHeaterMinutes > 0 ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  selections.trimWaterHeaterMinutes > 0 ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action 4: Standby Power */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('standbyPower')}</p>
              <p className="text-xs text-gray-500 mt-0.5">Switch off entertainment power strip overnight (~6 kWh/period)</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={selections.powerDownStandby}
              aria-label="Eliminate entertainment center overnight standby power"
              onClick={() =>
                setSelections((prev) => ({ ...prev, powerDownStandby: !prev.powerDownStandby }))
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                selections.powerDownStandby ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  selections.powerDownStandby ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action 5: Laundry Shift (Time-of-Use honesty demonstration) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {tariff.is_time_dependent ? t('laundryShiftTou') : t('laundryShift')}
              </p>
              <p className={`text-xs mt-0.5 font-medium ${tariff.is_time_dependent ? 'text-emerald-700' : 'text-amber-700'}`}>
                {laundryHelperText}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={selections.shiftLaundryToMorning}
              aria-label="Shift laundry cycle to morning hours"
              onClick={() =>
                setSelections((prev) => ({ ...prev, shiftLaundryToMorning: !prev.shiftLaundryToMorning }))
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                selections.shiftLaundryToMorning
                  ? tariff.is_time_dependent
                    ? 'bg-emerald-600'
                    : 'bg-amber-600'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  selections.shiftLaundryToMorning ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Counterfactual Outcome Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dynamic Cliff Avoidance Banner */}
          {outcome.didAvoidCliff && (
            <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-sm border border-emerald-700 animate-fadeIn">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-amber-300 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    ₹{outcome.cliffBonusInr.toFixed(2)} {t('cliffAvoidedAlert')}
                  </p>
                  <p className="text-xs text-emerald-50 mt-1 leading-relaxed">
                    {outcome.tierChangeDescription?.[language] ?? outcome.tierChangeDescription?.en}
                  </p>
                  <p className="text-[11px] text-emerald-100/90 mt-1.5 font-mono">
                    {`Slab savings ₹${outcome.slabSavingsInr.toFixed(2)} + Avoided cliff ₹${outcome.cliffBonusInr.toFixed(2)} = ₹${outcome.netSavingsInr.toFixed(2)} total`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Core Results Card */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-md border border-slate-700 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Counterfactual Simulation
              </span>
              <span className="text-xs px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded font-medium border border-amber-400/30">
                {t('provenanceSimulated')}
              </span>
            </div>

            {/* Consumption Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">{t('baselineConsumption')}</p>
                <p className="text-xl font-bold font-mono text-slate-200">
                  {outcome.baselineKwh.toFixed(1)} <span className="text-xs font-normal text-slate-400">kWh</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-400">{t('counterfactualConsumption')}</p>
                <p className="text-xl font-bold font-mono text-emerald-300">
                  {outcome.proposedKwh.toFixed(1)} <span className="text-xs font-normal text-slate-400">kWh</span>
                </p>
              </div>
            </div>

            {/* Bill Comparison */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
              <div>
                <p className="text-xs text-slate-400">{t('baselineBill')}</p>
                <p className="text-lg font-bold font-mono text-slate-300">
                  ₹{outcome.baselineBillInr.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('proposedBill')}</p>
                <p className="text-lg font-bold font-mono text-emerald-300">
                  ₹{outcome.proposedBillInr.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Net Savings Box */}
            <div className="p-4 bg-emerald-500/20 rounded-lg border border-emerald-500/40 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-200">{t('estimatedSavings')}</p>
                <p className="text-2xl font-extrabold font-mono text-white">
                  ₹{outcome.netSavingsInr.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-emerald-200">{t('totalUnitsSaved')}</p>
                <p className="text-lg font-bold font-mono text-emerald-300">
                  -{outcome.totalReductionKwh.toFixed(1)} kWh
                </p>
              </div>
            </div>
          </div>

          {/* Assumptions Box */}
          {outcome.assumptions.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2">
              <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                {t('assumptionsTitle')}
              </p>
              <ul className="list-disc pl-4 space-y-1 text-gray-600">
                {outcome.assumptions.map((asm, idx) => (
                  <li key={idx}>{asm[language] ?? asm.en}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
