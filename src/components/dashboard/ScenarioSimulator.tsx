'use client';

import React, { useState, useMemo } from 'react';
import { TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import type { TariffPlan } from '../../core/tariff/types';
import { calculateScenarioOutcome, type ScenarioActionSelection } from '../../core/simulation/scenario-engine';
import { useLanguage } from '../../locales/i18n';
import { Card, SectionHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ExpandableDetails } from '../ui/Disclosure';
import { CheckCircle2, Info } from 'lucide-react';

interface ScenarioSimulatorProps {
  baselineUnitsKwh: number;
  tariff?: TariffPlan;
}

interface SwitchRowProps {
  label: string;
  helper: string;
  helperTone?: 'neutral' | 'emerald' | 'amber';
  checked: boolean;
  ariaLabel: string;
  onToggle: () => void;
}

const SwitchRow: React.FC<SwitchRowProps> = ({
  label,
  helper,
  helperTone = 'neutral',
  checked,
  ariaLabel,
  onToggle,
}) => {
  const helperColor =
    helperTone === 'emerald'
      ? 'text-emerald-700 font-medium'
      : helperTone === 'amber'
      ? 'text-amber-700 font-medium'
      : 'text-zinc-500';

  return (
    <div className="p-4 rounded-xl border border-zinc-200/80 bg-white flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        <p className={`text-xs mt-0.5 leading-relaxed ${helperColor}`}>{helper}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
          checked ? 'bg-emerald-600' : 'bg-zinc-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

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
      ? 'TOU கட்டணத்தில் மாலை நேரத்திலிருந்து (19:00) காலைக்கு (07:00) மாற்றுவது சேமிப்பைத் தரும்'
      : 'Under TOU tariff, shifting 24 kWh from 19:00 peak to 07:00 yields modeled cost savings'
    : language === 'ta'
    ? 'நிலையான/அடுக்கு கட்டணத்தில் நேர மாற்றத்தால் நேரடி சேமிப்பு ₹0'
    : 'Under flat or slab tariffs, shifting time of use yields ₹0 direct savings';

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('simulatorTitle')}
        subtitle={t('simulatorSubtitle')}
        action={<Badge variant="neutral">{tariff.name}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-3">
          {/* AC Setpoint */}
          <Card className="p-4 sm:p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-zinc-900">{t('acThermostat')}</span>
              <Badge variant="emerald">+{selections.acSetpointDelta}°C</Badge>
            </div>
            <div
              className="grid grid-cols-4 gap-2"
              role="group"
              aria-label="AC thermostat setpoint delta"
            >
              {([0, 0.5, 1.0, 2.0] as const).map((delta) => (
                <button
                  key={delta}
                  type="button"
                  aria-pressed={selections.acSetpointDelta === delta}
                  onClick={() => setSelections((prev) => ({ ...prev, acSetpointDelta: delta }))}
                  className={`min-h-[40px] py-2 px-3 text-xs font-medium rounded-xl border transition-colors ${
                    selections.acSetpointDelta === delta
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {delta === 0 ? '0°C (Off)' : `+${delta}°C`}
                </button>
              ))}
            </div>
          </Card>

          <SwitchRow
            label={t('acRuntimeCurtail')}
            helper="Switch AC off 1h early (~90 kWh/cycle)"
            checked={selections.curtailAcHours === 1}
            ariaLabel="Curtail AC runtime by 1 hour daily"
            onToggle={() =>
              setSelections((prev) => ({
                ...prev,
                curtailAcHours: prev.curtailAcHours === 1 ? 0 : 1,
              }))
            }
          />

          <SwitchRow
            label={t('waterHeaterTimer')}
            helper="Trim water heater duration once heated (~20 kWh/cycle)"
            checked={selections.trimWaterHeaterMinutes > 0}
            ariaLabel="Trim water heater duration by 15 to 20 minutes"
            onToggle={() =>
              setSelections((prev) => ({
                ...prev,
                trimWaterHeaterMinutes: prev.trimWaterHeaterMinutes > 0 ? 0 : 20,
              }))
            }
          />

          <SwitchRow
            label={t('standbyPower')}
            helper="Switch off TV & console power strip overnight (~6 kWh/cycle)"
            checked={selections.powerDownStandby}
            ariaLabel="Eliminate entertainment center overnight standby power"
            onToggle={() =>
              setSelections((prev) => ({ ...prev, powerDownStandby: !prev.powerDownStandby }))
            }
          />

          <SwitchRow
            label={tariff.is_time_dependent ? t('laundryShiftTou') : t('laundryShift')}
            helper={laundryHelperText}
            helperTone={tariff.is_time_dependent ? 'emerald' : 'amber'}
            checked={selections.shiftLaundryToMorning}
            ariaLabel="Shift laundry cycle to morning hours"
            onToggle={() =>
              setSelections((prev) => ({
                ...prev,
                shiftLaundryToMorning: !prev.shiftLaundryToMorning,
              }))
            }
          />
        </div>

        {/* Light-Surface Outcome Column */}
        <div className="lg:col-span-5 space-y-4">
          {outcome.didAvoidCliff && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">
                    ₹{outcome.cliffBonusInr.toFixed(2)} · {t('cliffAvoidedAlert')}
                  </p>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    {outcome.tierChangeDescription?.[language] ?? outcome.tierChangeDescription?.en}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-xs font-medium text-zinc-500">
                {language === 'ta' ? 'மாதிரி முடிவுகள்' : 'Projected outcome'}
              </span>
              <Badge variant="amber">{t('provenanceSimulated')}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">{t('baselineConsumption')}</p>
                <p className="text-xl font-semibold text-zinc-900 tabular-nums mt-0.5">
                  {outcome.baselineKwh.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-zinc-400">kWh</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">{t('counterfactualConsumption')}</p>
                <p className="text-xl font-semibold text-emerald-700 tabular-nums mt-0.5">
                  {outcome.proposedKwh.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-emerald-600/70">kWh</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
              <div>
                <p className="text-xs text-zinc-500">{t('baselineBill')}</p>
                <p className="text-lg font-semibold text-zinc-800 tabular-nums mt-0.5">
                  ₹{outcome.baselineBillInr.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t('proposedBill')}</p>
                <p className="text-lg font-semibold text-emerald-700 tabular-nums mt-0.5">
                  ₹{outcome.proposedBillInr.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-emerald-900">{t('estimatedSavings')}</p>
                <p className="text-2xl sm:text-3xl font-semibold text-emerald-700 tabular-nums mt-0.5">
                  ₹{outcome.netSavingsInr.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-800">{t('totalUnitsSaved')}</p>
                <p className="text-base font-semibold text-emerald-700 tabular-nums mt-0.5">
                  -{outcome.totalReductionKwh.toFixed(1)} kWh
                </p>
              </div>
            </div>

            {outcome.assumptions.length > 0 && (
              <ExpandableDetails
                summary={t('assumptionsTitle')}
                icon={<Info className="w-3.5 h-3.5 text-zinc-400" />}
              >
                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-600">
                  {outcome.assumptions.map((asm, idx) => (
                    <li key={idx}>{asm[language] ?? asm.en}</li>
                  ))}
                </ul>
              </ExpandableDetails>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
