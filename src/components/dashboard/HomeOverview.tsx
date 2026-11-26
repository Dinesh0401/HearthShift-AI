'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { TariffPlan } from '../../core/tariff/types';
import { calculateBill } from '../../core/tariff/calculator';
import { detectTariffCliffThreshold } from '../../core/simulation/scenario-engine';
import type { CapabilityEvaluation } from '../../core/capabilities/policy';
import type { StoredBillEntry } from '../../lib/db';
import { db } from '../../lib/db';
import {
  generateHouseholdRecommendation,
  DEFAULT_INITIAL_BELIEF,
  updateBeliefWithFeedback,
  type RecommendationEngineOutput,
} from '../../core/recommendation/engine';
import type { LatentPreferenceBelief } from '../../core/optimization/tr-voi';
import type { AdaptiveQuestion, Recommendation } from '../../types/contracts';
import { useLanguage } from '../../locales/i18n';
import { AdaptiveQueryModal } from './AdaptiveQueryModal';
import { Card, MetricCard } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ExpandableDetails } from '../ui/Disclosure';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  HelpCircle,
  Receipt,
  Upload,
  Check,
} from 'lucide-react';

interface HomeOverviewProps {
  tariff: TariffPlan;
  evaluation: CapabilityEvaluation | null;
  latestBill: StoredBillEntry | null;
  billsCount: number;
  readingsCount: number;
  readingsSpanDays: number;
  isDemoMode: boolean;
  isLoading: boolean;
  isDemoBusy: boolean;
  onLoadDemo: () => void;
  onNavigate: (
    tab: 'bills' | 'import' | 'intervals' | 'simulator' | 'recommendations' | 'savings'
  ) => void;
  onActionLogged?: () => void;
}

function formatPeriodLabel(start: string, end: string, language: 'en' | 'ta'): string {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return `${start} – ${end}`;
  }
  const locale = language === 'ta' ? 'ta-IN' : 'en-US';
  const startMonth = s.toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' });
  const endMonthYear = e.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${startMonth} – ${endMonthYear}`;
  }
  return `${s.toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })} – ${e.toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })}`;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({
  tariff,
  evaluation,
  latestBill,
  billsCount,
  readingsCount,
  readingsSpanDays,
  isDemoMode,
  isLoading,
  isDemoBusy,
  onLoadDemo,
  onNavigate,
  onActionLogged,
}) => {
  const { t, language } = useLanguage();
  const [belief, setBelief] = useState<LatentPreferenceBelief>(DEFAULT_INITIAL_BELIEF);
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [recOutput, setRecOutput] = useState<RecommendationEngineOutput | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<AdaptiveQuestion | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const usageKwh = latestBill ? latestBill.total_units_kwh : 0;

  const evaluateAction = useCallback(
    async (currBelief: LatentPreferenceBelief, currAsked: string[]) => {
      if (!latestBill) {
        setRecOutput(null);
        return;
      }
      try {
        await db.initialize();
        const pref = await db.preferences.get('default_household');
        const constraints =
          pref?.comfort_constraints && pref.comfort_constraints.length > 0
            ? pref.comfort_constraints
            : readingsCount >= 168
            ? [
                {
                  id: 'default_c',
                  type: 'temperature_bound' as const,
                  description: 'Default AC comfort bounds',
                  flexibility: 'medium' as const,
                  confidence: 1.0,
                },
              ]
            : [];

        const out = generateHouseholdRecommendation({
          baselineKwh: latestBill.total_units_kwh,
          tariff,
          belief: currBelief,
          askedQuestionIds: currAsked,
          capabilityInputs: {
            bills_count: billsCount,
            readings_count: readingsCount,
            readings_span_days: readingsSpanDays,
            comfort_constraints: constraints,
            active_tariff: tariff,
          },
        });
        setRecOutput(out);
      } catch (err) {
        console.error('Overview recommendation preview failed', err);
      }
    },
    [latestBill, tariff, billsCount, readingsCount, readingsSpanDays]
  );

  useEffect(() => {
    evaluateAction(belief, askedIds);
  }, [evaluateAction, belief, askedIds]);

  const handleAnswerQuestion = (val: 1 | -1 | 0) => {
    if (!activeQuestion) return;
    const idx =
      activeQuestion.category === 'cooling'
        ? 0
        : activeQuestion.category === 'laundry'
        ? 1
        : activeQuestion.category === 'water_heating'
        ? 2
        : 3;
    setBelief((prev) => updateBeliefWithFeedback(prev, idx, val));
    setAskedIds((prev) => [...prev, activeQuestion.id]);
    setActiveQuestion(null);
  };

  const handleLogTried = async (rec: Recommendation) => {
    try {
      await db.initialize();
      await db.feedback.add({
        id: `fb_${Date.now()}`,
        recommendation_id: rec.id,
        timestamp: new Date().toISOString(),
        response: 'tried_it',
      });
      await db.savings.add({
        id: `sav_${Date.now()}`,
        recommendation_id: rec.id,
        action_id: rec.id,
        action_title: rec.action.title,
        period_start: new Date().toISOString().slice(0, 10),
        period_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        estimated_savings: rec.savings_estimate.point_estimate,
        basis: 'user_reported',
        verified: false,
        notes: rec.action.title[language] ?? rec.action.title.en,
      });
      setToast(t('actionCompleted'));
      setTimeout(() => setToast(null), 3500);
      onActionLogged?.();
    } catch (err) {
      console.error('Failed to log action from overview', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-44" />
      </div>
    );
  }

  const readinessVariant =
    evaluation?.mode === 'OPTIMIZATION_ELIGIBLE'
      ? 'emerald'
      : evaluation?.mode === 'INTERVAL'
      ? 'blue'
      : 'amber';

  const readinessLabel =
    evaluation?.mode === 'OPTIMIZATION_ELIGIBLE'
      ? t('modeReadyLabel')
      : evaluation?.mode === 'INTERVAL'
      ? t('modeIntervalLabel')
      : t('modeBasicLabel');

  // Empty state before any household bill exists
  if (!latestBill) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
              {t('overviewTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">{tariff.name}</p>
          </div>
          {evaluation && (
            <Badge variant={readinessVariant} dot>
              {readinessLabel}
            </Badge>
          )}
        </div>

        <EmptyState
          icon={<Receipt className="w-5 h-5" />}
          title={t('overviewNoBillTitle')}
          description={t('overviewNoBillDesc')}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('bills')}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors"
              >
                <span>{t('overviewAddBillCta')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onLoadDemo}
                disabled={isDemoBusy}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
              >
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <span>{t('loadDemoBtn')}</span>
              </button>
            </div>
          }
        />

        <p className="text-xs text-zinc-400 text-center">{t('overviewFooterNote')}</p>
      </div>
    );
  }

  const periodLabel = formatPeriodLabel(
    latestBill.billing_period_start,
    latestBill.billing_period_end,
    language
  );
  const currentBill = calculateBill(usageKwh, tariff);
  const cliffThreshold = detectTariffCliffThreshold(tariff);

  let thresholdDistanceText = t('overviewModelEstimate');
  let usageAccent: 'default' | 'emerald' | 'amber' | 'rose' = 'default';
  let crossedThreshold = false;
  let nearThreshold = false;
  let cliffCostDeltaInr = 0;
  let billAtCliffInr = 0;
  let billPastCliffInr = 0;

  if (cliffThreshold !== null) {
    const diff = usageKwh - cliffThreshold;
    const atCliff = calculateBill(cliffThreshold, tariff);
    const pastCliff = calculateBill(cliffThreshold + 1, tariff);
    billAtCliffInr = atCliff.net_payable_paise / 100;
    billPastCliffInr = pastCliff.net_payable_paise / 100;
    cliffCostDeltaInr = billPastCliffInr - billAtCliffInr;

    if (diff > 0) {
      crossedThreshold = true;
      usageAccent = 'rose';
      thresholdDistanceText =
        language === 'ta'
          ? `${cliffThreshold} kWh எல்லையை விட ${diff} kWh அதிகம்`
          : `${diff} kWh over ${cliffThreshold} kWh threshold`;
    } else if (usageKwh > Math.round(cliffThreshold * 0.84)) {
      nearThreshold = true;
      usageAccent = 'amber';
      thresholdDistanceText =
        language === 'ta'
          ? `${cliffThreshold} kWh எல்லைக்கு ${Math.abs(diff)} kWh முன்பு`
          : `${Math.abs(diff)} kWh under ${cliffThreshold} kWh threshold`;
    } else {
      usageAccent = 'emerald';
      thresholdDistanceText =
        language === 'ta'
          ? `${cliffThreshold} kWh எல்லைக்குள் (${Math.abs(diff)} kWh மீதம்)`
          : `${Math.abs(diff)} kWh under ${cliffThreshold} kWh limit`;
    }
  }

  const wholeInr = Math.floor(currentBill.net_payable_paise / 100).toLocaleString('en-IN');
  const paiseSuffix = String(currentBill.net_payable_paise % 100).padStart(2, '0');
  const progressMax = cliffThreshold ? Math.round(cliffThreshold * 1.2) : 600;
  const progressPct = Math.min(100, (usageKwh / progressMax) * 100);
  const limitMarkerPct = cliffThreshold ? (cliffThreshold / progressMax) * 100 : 80;

  const rec = recOutput?.recommendation;
  const askQuestion = recOutput?.outcome === 'ask_question' ? recOutput.candidateQuestion : null;

  return (
    <div className="space-y-5 animate-fadeIn">
      {toast && (
        <div
          role="status"
          className="p-3 rounded-xl bg-emerald-700 text-white text-xs font-medium flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {activeQuestion && (
        <AdaptiveQueryModal
          question={activeQuestion}
          onAnswer={handleAnswerQuestion}
          onClose={() => setActiveQuestion(null)}
        />
      )}

      {/* Title & Context */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            {t('overviewTitle')}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{periodLabel}</span>
            {isDemoMode && (
              <Badge variant="amber" dot>
                {t('overviewSampleTag')}
              </Badge>
            )}
          </div>
        </div>
        {evaluation && (
          <Badge variant={readinessVariant} dot>
            {readinessLabel}
          </Badge>
        )}
      </div>

      {/* Primary Hero KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          label={t('overviewUsageLabel')}
          value={String(usageKwh)}
          unit="kWh"
          accent={usageAccent}
          helper={
            <span
              className={`font-medium ${
                crossedThreshold
                  ? 'text-rose-700'
                  : nearThreshold
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {thresholdDistanceText}
            </span>
          }
        />

        <MetricCard
          label={t('overviewEstimatedBillLabel')}
          value={`₹${wholeInr}`}
          unit={paiseSuffix !== '00' ? `.${paiseSuffix}` : undefined}
          helper={
            <span className="text-zinc-500">
              {t('overviewModelEstimate')} · {tariff.billing_cadence}
            </span>
          }
        />
      </div>

      {/* Threshold Bar Card */}
      {cliffThreshold !== null && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{t('overviewThresholdTitle')}</h3>
            <span className="text-xs font-medium text-zinc-500 tabular-nums">
              {cliffThreshold} kWh {language === 'ta' ? 'எல்லை' : 'limit'}
            </span>
          </div>

          <div
            className="mt-4 relative w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.min(progressMax, usageKwh)}
            aria-valuemin={0}
            aria-valuemax={progressMax}
            aria-label={`Electricity usage relative to ${cliffThreshold} kWh threshold`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                crossedThreshold
                  ? 'bg-rose-500'
                  : nearThreshold
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-400"
              style={{ left: `${limitMarkerPct}%` }}
              aria-hidden="true"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-xs font-medium flex items-center gap-1.5 ${
                crossedThreshold
                  ? 'text-rose-700'
                  : nearThreshold
                  ? 'text-amber-800'
                  : 'text-emerald-700'
              }`}
            >
              {crossedThreshold || nearThreshold ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {crossedThreshold
                  ? t('cliffWarningTitle')
                  : nearThreshold
                  ? language === 'ta'
                    ? `${cliffThreshold} kWh எல்லையை நெருங்குகிறீர்கள் — கடப்பதைத் தவிர்க்கவும்`
                    : `Approaching ${cliffThreshold} kWh threshold — crossing adds ₹${cliffCostDeltaInr.toFixed(0)}`
                  : t('subsidyEligibility')}
              </span>
            </p>
          </div>

          <ExpandableDetails summary={t('viewDetails')} className="mt-3">
            <div className="space-y-3 text-xs text-zinc-600">
              {cliffCostDeltaInr > 0 && (
                <p className="leading-relaxed text-zinc-700">
                  {t('cliffWarningText')}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="text-[11px] text-zinc-500 block">
                    {cliffThreshold} kWh
                  </span>
                  <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                    ₹{billAtCliffInr.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="text-[11px] text-zinc-500 block">
                    {cliffThreshold + 1} kWh
                  </span>
                  <span className="text-sm font-semibold text-rose-700 tabular-nums">
                    ₹{billPastCliffInr.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <span className="text-[11px] text-zinc-500 block">
                    {language === 'ta' ? 'கூடுதல் கட்டணம்' : 'Threshold jump'}
                  </span>
                  <span className="text-sm font-semibold text-rose-700 tabular-nums">
                    +₹{cliffCostDeltaInr.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">{tariff.name} · {tariff.tariff_order_ref}</p>
            </div>
          </ExpandableDetails>
        </Card>
      )}

      {/* Primary Suggested Action Card */}
      {rec && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  {t('overviewSuggestedActionTitle')}
                </span>
                <Badge variant="amber">{t('modeledEstimateBadge')}</Badge>
                <Badge variant="emerald">{t('conservativeLowerBoundBadge')}</Badge>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900">
                {rec.action.title[language] ?? rec.action.title.en}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
                {rec.action.description[language] ?? rec.action.description.en}
              </p>
            </div>

            <div className="sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
              <span className="text-xs font-medium text-zinc-500 block">
                {t('expectedSavingsLabel')}
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-emerald-700 tabular-nums">
                ₹{rec.savings_estimate.point_estimate.toFixed(0)}
              </span>
              <div className="mt-3 flex flex-wrap sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleLogTried(rec)}
                  className="px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                >
                  {t('feedbackTriedIt')}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('recommendations')}
                  className="inline-flex items-center gap-1 px-3.5 py-2 min-h-[40px] rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
                >
                  <span>{t('viewDetails')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!rec && askQuestion && (
        <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{t('adaptiveQuestionTitle')}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{t('adaptiveQuestionSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveQuestion(askQuestion)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shrink-0 transition-colors"
          >
            <span>{t('overviewOpenRecommendations')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>
      )}

      {!rec && !askQuestion && recOutput?.outcome === 'abstain' && !recOutput.capabilityGated && (
        <Card className="p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-zinc-900">{t('abstentionTitle')}</h3>
          <p className="text-xs text-zinc-500 mt-1">{t('abstentionReason')}</p>
        </Card>
      )}

      {(!recOutput || recOutput.capabilityGated) && (
        <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-900">{t('overviewNeedMoreDataTitle')}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
              {t('overviewNeedMoreDataDesc')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('import')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('overviewImportUnlockCta')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('simulator')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
            >
              <span>{t('overviewOpenSimulator')}</span>
            </button>
          </div>
        </Card>
      )}

      {/* Subtle Bottom Model Disclosure */}
      <p className="text-xs text-zinc-400 leading-relaxed">
        {t('overviewFooterNote')}
      </p>
    </div>
  );
};
