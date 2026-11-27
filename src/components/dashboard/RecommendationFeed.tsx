'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';
import { TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import type { TariffPlan } from '../../core/tariff/types';
import {
  generateHouseholdRecommendation,
  DEFAULT_INITIAL_BELIEF,
  updateBeliefWithFeedback,
  type RecommendationEngineOutput,
} from '../../core/recommendation/engine';
import type { LatentPreferenceBelief } from '../../core/optimization/tr-voi';
import { loadDashboardHouseholdSnapshot } from '../../core/storage/household-preferences';
import type { AdaptiveQuestion, ComfortConstraint, Recommendation } from '../../types/contracts';
import { AdaptiveQueryModal } from './AdaptiveQueryModal';
import { ComfortPreferencesCard } from './ComfortPreferencesCard';
import { useLanguage } from '../../locales/i18n';
import { Card, SectionHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ExpandableDetails } from '../ui/Disclosure';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from 'lucide-react';

interface RecommendationFeedProps {
  latestUnitsKwh: number;
  tariff?: TariffPlan;
  belief?: LatentPreferenceBelief;
  askedQuestionIds?: string[];
  onBeliefUpdated?: (nextBelief: LatentPreferenceBelief, nextAskedIds: string[]) => void;
  isDemoMode?: boolean;
  refreshTrigger?: number;
  onActionLogged?: () => void;
  onPreferencesUpdated?: () => void;
}

export const RecommendationFeed: React.FC<RecommendationFeedProps> = ({
  latestUnitsKwh,
  tariff = TNPDCL_LT1A_2026_MAY10,
  belief: externalBelief,
  askedQuestionIds: externalAskedIds,
  onBeliefUpdated,
  isDemoMode = false,
  refreshTrigger = 0,
  onActionLogged,
  onPreferencesUpdated,
}) => {
  const { t, language } = useLanguage();

  const [localBelief, setLocalBelief] = useState<LatentPreferenceBelief>(DEFAULT_INITIAL_BELIEF);
  const [localAskedQuestionIds, setLocalAskedQuestionIds] = useState<string[]>([]);
  const belief = externalBelief ?? localBelief;
  const askedQuestionIds = externalAskedIds ?? localAskedQuestionIds;

  const updateSharedBelief = (
    nextBelief: LatentPreferenceBelief,
    nextAskedIds: string[] = askedQuestionIds
  ) => {
    if (onBeliefUpdated) {
      onBeliefUpdated(nextBelief, nextAskedIds);
    } else {
      setLocalBelief(nextBelief);
      setLocalAskedQuestionIds(nextAskedIds);
    }
  };
  const [engineOutput, setEngineOutput] = useState<RecommendationEngineOutput | null>(null);
  const [comfortConstraints, setComfortConstraints] = useState<ComfortConstraint[]>([]);
  const [hasAdequateCoverage, setHasAdequateCoverage] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<AdaptiveQuestion | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const runEngine = useCallback(
    async (currentBelief: LatentPreferenceBelief, askedIds: string[]) => {
      try {
        setLoading(true);
        const snapshot = await loadDashboardHouseholdSnapshot(tariff);

        setComfortConstraints(snapshot.comfortConstraints);
        setHasAdequateCoverage(
          snapshot.readingsSpanDays >= 7 && snapshot.readingsCount >= 168
        );

        const output = generateHouseholdRecommendation({
          baselineKwh: latestUnitsKwh,
          tariff,
          belief: currentBelief,
          askedQuestionIds: askedIds,
          capabilityInputs: {
            bills_count: snapshot.billsCount,
            readings_count: snapshot.readingsCount,
            readings_span_days: snapshot.readingsSpanDays,
            comfort_constraints: snapshot.comfortConstraints,
            active_tariff: tariff,
          },
        });

        setEngineOutput(output);

        if (output.outcome === 'ask_question' && output.candidateQuestion) {
          setActiveQuestion(output.candidateQuestion);
        } else {
          setActiveQuestion(null);
        }
      } catch (err) {
        console.error('Failed to run recommendation engine', err);
      } finally {
        setLoading(false);
      }
    },
    [latestUnitsKwh, tariff]
  );

  useEffect(() => {
    runEngine(belief, askedQuestionIds);
  }, [runEngine, belief, askedQuestionIds, refreshTrigger]);

  const handleComfortPreferencesChanged = () => {
    setFeedbackToast(t('comfortSavedToast'));
    setTimeout(() => setFeedbackToast(null), 3000);
    runEngine(belief, askedQuestionIds);
    onPreferencesUpdated?.();
  };

  const handleAnswerQuestion = (responseVal: 1 | -1 | 0) => {
    if (!activeQuestion) return;

    const updatedBelief = updateBeliefWithFeedback(
      belief,
      activeQuestion.category === 'cooling'
        ? 0
        : activeQuestion.category === 'laundry'
        ? 1
        : activeQuestion.category === 'water_heating'
        ? 2
        : 3,
      responseVal
    );
    const updatedAsked = [...askedQuestionIds, activeQuestion.id];

    updateSharedBelief(updatedBelief, updatedAsked);
    setActiveQuestion(null);

    setFeedbackToast(t('feedbackRecorded'));
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleFeedback = async (
    rec: Recommendation,
    response: 'useful' | 'impractical' | 'tried_it'
  ) => {
    try {
      await db.initialize();

      await db.feedback.add({
        id: `fb_${Date.now()}`,
        recommendation_id: rec.id,
        timestamp: new Date().toISOString(),
        response,
      });

      if (response === 'tried_it') {
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

        const featIdx =
          rec.action.appliance_category === 'cooling'
            ? 0
            : rec.action.appliance_category === 'laundry'
            ? 1
            : rec.action.appliance_category === 'water_heating'
            ? 2
            : 3;
        updateSharedBelief(updateBeliefWithFeedback(belief, featIdx, 1));
        setFeedbackToast(t('actionCompleted'));
        onActionLogged?.();
      } else if (response === 'impractical') {
        const featIdx =
          rec.action.appliance_category === 'cooling'
            ? 0
            : rec.action.appliance_category === 'laundry'
            ? 1
            : rec.action.appliance_category === 'water_heating'
            ? 2
            : 3;
        updateSharedBelief(updateBeliefWithFeedback(belief, featIdx, -1));
        setFeedbackToast(t('feedbackRecorded'));
      } else {
        setFeedbackToast(t('feedbackRecorded'));
      }

      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (err) {
      console.error('Failed to record feedback', err);
    }
  };

  const rec = engineOutput?.recommendation;
  const isTariffActionable =
    Boolean(tariff.is_time_dependent) || tariff.gross_tariff.type === 'tiered_slab';
  const needsComfortInput =
    hasAdequateCoverage && comfortConstraints.length === 0 && isTariffActionable;

  const effortLabel = rec
    ? rec.action.estimated_effort === 'minimal'
      ? language === 'ta'
        ? 'குறைந்த முயற்சி'
        : 'Minimal effort'
      : rec.action.estimated_effort === 'moderate'
      ? language === 'ta'
        ? 'மிதமான முயற்சி'
        : 'Moderate effort'
      : language === 'ta'
      ? 'கணிசமான முயற்சி'
      : 'Significant effort'
    : '';

  return (
    <div className="space-y-5">
      {feedbackToast && (
        <div
          role="status"
          className="p-3.5 bg-emerald-700 text-white text-xs font-medium rounded-xl flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {activeQuestion && (
        <AdaptiveQueryModal
          question={activeQuestion}
          onAnswer={handleAnswerQuestion}
          onClose={() => setActiveQuestion(null)}
        />
      )}

      <SectionHeader
        title={t('recommendationsTitle')}
        subtitle={t('recommendationsSubtitle')}
        action={<Badge variant="neutral">{tariff.name}</Badge>}
      />

      {!loading && comfortConstraints.length > 0 && (
        <ComfortPreferencesCard
          comfortConstraints={comfortConstraints}
          isDemoMode={isDemoMode}
          onUpdated={handleComfortPreferencesChanged}
        />
      )}

      {loading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-12 w-40" />
        </Card>
      ) : needsComfortInput ? (
        <ComfortPreferencesCard
          comfortConstraints={comfortConstraints}
          isDemoMode={isDemoMode}
          onUpdated={handleComfortPreferencesChanged}
        />
      ) : engineOutput?.capabilityGated ? (
        <EmptyState
          icon={<ShieldAlert className="w-5 h-5 text-amber-600" />}
          title={t('capabilityStatus')}
          description={engineOutput.gateReason ?? t('overviewNeedMoreDataDesc')}
        />
      ) : engineOutput?.outcome === 'abstain' ? (
        <EmptyState
          icon={<ShieldCheck className="w-5 h-5 text-zinc-500" />}
          title={t('abstentionTitle')}
          description={t('abstentionReason')}
        />
      ) : rec ? (
        <Card className="p-5 sm:p-6 space-y-5">
          {/* Card Summary */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-2.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="amber">{t('modeledEstimateBadge')}</Badge>
                <Badge variant="emerald">{t('conservativeLowerBoundBadge')}</Badge>
                <Badge variant="neutral">{effortLabel}</Badge>
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-zinc-900">
                {rec.action.title[language] ?? rec.action.title.en}
              </h3>

              <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">
                {rec.action.description[language] ?? rec.action.description.en}
              </p>
            </div>

            <div className="md:text-right shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100">
              <span className="text-xs font-medium text-zinc-500 block">
                {t('expectedSavingsLabel')}
              </span>
              <span className="text-3xl sm:text-4xl font-semibold text-emerald-700 tabular-nums mt-0.5 block">
                ₹{rec.savings_estimate.point_estimate.toFixed(2)}
              </span>

              <div className="mt-4 flex flex-wrap md:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleFeedback(rec, 'tried_it')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium rounded-xl transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('feedbackTriedIt')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Details */}
          <ExpandableDetails
            summary={t('viewDetails')}
            icon={<Lightbulb className="w-3.5 h-3.5 text-emerald-600" />}
            className="pt-2 border-t border-zinc-100"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                  <span className="text-xs font-medium text-zinc-500 block">
                    {t('lowerBoundLabel')}
                  </span>
                  <span className="text-xl font-semibold text-zinc-900 tabular-nums mt-0.5 block">
                    ₹{rec.savings_estimate.lower_bound.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-0.5 block">
                    {t('lowerBoundHelp')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                  <span className="text-xs font-medium text-zinc-500 block">
                    {t('whyThisHelpsTitle')}
                  </span>
                  <p className="text-xs text-zinc-700 leading-relaxed mt-1">
                    {rec.explanation[language] ?? rec.explanation.en}
                  </p>
                </div>
              </div>

              {rec.assumptions.length > 0 && (
                <div className="space-y-1.5 text-xs text-zinc-600">
                  <p className="font-semibold text-zinc-800">{t('assumptionsTitle')}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {rec.assumptions.map((asm, idx) => (
                      <li key={idx}>{asm[language] ?? asm.en}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">
                  {language === 'ta'
                    ? 'இது உங்கள் வீட்டிற்குப் பொருந்துகிறதா?'
                    : 'Was this practical for your home?'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFeedback(rec, 'useful')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{t('feedbackUseful')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(rec, 'impractical')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>{t('feedbackImpractical')}</span>
                  </button>
                </div>
              </div>
            </div>
          </ExpandableDetails>
        </Card>
      ) : null}
    </div>
  );
};
