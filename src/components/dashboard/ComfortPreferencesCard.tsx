'use client';

import React, { useState } from 'react';
import type { ComfortConstraint, Flexibility } from '../../types/contracts';
import {
  clearConfirmedComfortPreferences,
  saveConfirmedComfortPreferences,
  type UserComfortDraft,
} from '../../core/storage/household-preferences';
import { useLanguage } from '../../locales/i18n';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ShieldCheck, SlidersHorizontal, RotateCcw } from 'lucide-react';

interface ComfortPreferencesCardProps {
  comfortConstraints: ComfortConstraint[];
  isDemoMode: boolean;
  onUpdated: () => void;
}

export const ComfortPreferencesCard: React.FC<ComfortPreferencesCardProps> = ({
  comfortConstraints,
  isDemoMode,
  onUpdated,
}) => {
  const { t } = useLanguage();
  const [acEnabled, setAcEnabled] = useState(false);
  const [acFlexibility, setAcFlexibility] = useState<Flexibility>('medium');
  const [waterHeaterFlexible, setWaterHeaterFlexible] = useState(false);
  const [laundryShiftFlexible, setLaundryShiftFlexible] = useState(false);
  const [standbyManageable, setStandbyManageable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasAnySelection =
    acEnabled || waterHeaterFlexible || laundryShiftFlexible || standbyManageable;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!hasAnySelection) {
      setErrorMsg(t('comfortSelectPrompt'));
      return;
    }

    const draft: UserComfortDraft = {
      acFlexibility: acEnabled ? acFlexibility : null,
      waterHeaterFlexible,
      laundryShiftFlexible,
      standbyManageable,
    };

    try {
      setIsSaving(true);
      await saveConfirmedComfortPreferences(draft);
      onUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('comfortSelectPrompt'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsSaving(true);
      await clearConfirmedComfortPreferences();
      setAcEnabled(false);
      setWaterHeaterFlexible(false);
      setLaundryShiftFlexible(false);
      setStandbyManageable(false);
      onUpdated();
    } catch (err) {
      console.error('Failed to reset comfort preferences', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (comfortConstraints.length > 0) {
    const isSampleSet = isDemoMode || comfortConstraints.every((c) => c.id.startsWith('demo_'));
    return (
      <Card className="p-4 sm:p-5 bg-zinc-50/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Badge variant={isSampleSet ? 'amber' : 'emerald'} dot>
              {isSampleSet ? t('comfortActiveSampleBadge') : t('comfortActiveUserBadge')}
            </Badge>
            <span className="text-xs text-zinc-500 truncate">
              {comfortConstraints.map((c) => c.description).join(' · ')}
            </span>
          </div>
          {!isSampleSet && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('comfortClearBtn')}</span>
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleConfirm} className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{t('comfortSetupTitle')}</h3>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {t('comfortSetupSubtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acEnabled}
                onChange={(e) => setAcEnabled(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span className="text-zinc-800 font-medium">{t('comfortAcOption')}</span>
            </label>

            {acEnabled && (
              <div className="pl-6 flex flex-wrap items-center gap-2">
                <span className="text-zinc-500">{t('comfortAcFlexibilityLabel')}:</span>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={acFlexibility === level}
                    onClick={() => setAcFlexibility(level)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                      acFlexibility === level
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {level === 'low'
                      ? t('comfortFlexLow')
                      : level === 'medium'
                      ? t('comfortFlexMedium')
                      : t('comfortFlexHigh')}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-zinc-200 bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={waterHeaterFlexible}
              onChange={(e) => setWaterHeaterFlexible(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
            />
            <span className="text-zinc-800 font-medium">{t('comfortWaterHeaterOption')}</span>
          </label>

          <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-zinc-200 bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={laundryShiftFlexible}
              onChange={(e) => setLaundryShiftFlexible(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
            />
            <span className="text-zinc-800 font-medium">{t('comfortLaundryOption')}</span>
          </label>

          <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-zinc-200 bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={standbyManageable}
              onChange={(e) => setStandbyManageable(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
            />
            <span className="text-zinc-800 font-medium">{t('comfortStandbyOption')}</span>
          </label>
        </div>

        {errorMsg && (
          <p role="alert" className="text-xs text-rose-600 font-medium">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{t('offlineStatus')} · {t('privacyBadgeShort')}</span>
          </span>
          <button
            type="submit"
            disabled={!hasAnySelection || isSaving}
            className="px-4 py-2.5 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            {isSaving ? t('comfortSavingBtn') : t('comfortConfirmBtn')}
          </button>
        </div>
      </form>
    </Card>
  );
};
