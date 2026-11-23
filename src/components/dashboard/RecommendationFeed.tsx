'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';
import { TNPDCL_LT1A_2026_MAY10 } from '../../core/tariff/tariffs/tnpdcl-lt1a';
import {
  generateHouseholdRecommendation,
  DEFAULT_INITIAL_BELIEF,
  updateBeliefWithFeedback,
  type RecommendationEngineOutput,
} from '../../core/recommendation/engine';
import type { LatentPreferenceBelief } from '../../core/optimization/tr-voi';
import type { Recommendation, AdaptiveQuestion } from '../../types/contracts';
import { AdaptiveQueryModal } from './AdaptiveQueryModal';
import { useLanguage } from '../../locales/i18n';
import { 
  Lightbulb, 
  ShieldAlert, 
  ShieldCheck, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  Info, 
  Zap, 
  TrendingDown, 
  Clock 
} from 'lucide-react';

interface RecommendationFeedProps {
  latestUnitsKwh: number;
  onActionLogged?: () => void;
}

export const RecommendationFeed: React.FC<RecommendationFeedProps> = ({
  latestUnitsKwh,
  onActionLogged,
}) => {
  const { t, language } = useLanguage();

  const [belief, setBelief] = useState<LatentPreferenceBelief>(DEFAULT_INITIAL_BELIEF);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [engineOutput, setEngineOutput] = useState<RecommendationEngineOutput | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<AdaptiveQuestion | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Evaluate recommendation
  const runEngine = useCallback(async (currentBelief: LatentPreferenceBelief, askedIds: string[]) => {
    try {
      await db.initialize();
      const bCount = await db.bills.count();
      const rCount = await db.readings.count();

      let spanDays = 0;
      if (rCount > 0) {
        const first = await db.readings.orderBy('timestamp').first();
        const last = await db.readings.orderBy('timestamp').reverse().first();
        if (first && last) {
          const diffMs = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
          spanDays = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24));
        }
      }

      const pref = await db.preferences.get('default_household');
      const constraints = pref?.comfort_constraints && pref.comfort_constraints.length > 0
        ? pref.comfort_constraints
        : (rCount >= 168 ? [{ id: 'default_c', type: 'temperature_max' as const, description: 'Default AC comfort bounds', flexibility: 'moderate' as const, confidence: 1.0 }] : []);

      const output = generateHouseholdRecommendation({
        baselineKwh: latestUnitsKwh,
        tariff: TNPDCL_LT1A_2026_MAY10,
        belief: currentBelief,
        askedQuestionIds: askedIds,
        capabilityInputs: {
          bills_count: bCount,
          readings_count: rCount,
          readings_span_days: spanDays,
          comfort_constraints: constraints,
          active_tariff: TNPDCL_LT1A_2026_MAY10,
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
    }
  }, [latestUnitsKwh]);

  useEffect(() => {
    runEngine(belief, askedQuestionIds);
  }, [runEngine, belief, askedQuestionIds]);

  // Handle Question Answer
  const handleAnswerQuestion = (responseVal: 1 | -1 | 0) => {
    if (!activeQuestion) return;

    const updatedBelief = updateBeliefWithFeedback(belief, activeQuestion.category === 'cooling' ? 0 : activeQuestion.category === 'laundry' ? 1 : activeQuestion.category === 'water_heating' ? 2 : 3, responseVal);
    const updatedAsked = [...askedQuestionIds, activeQuestion.id];

    setBelief(updatedBelief);
    setAskedQuestionIds(updatedAsked);
    setActiveQuestion(null);

    setFeedbackToast(t('feedbackRecorded'));
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Handle Feedback Button Clicks
  const handleFeedback = async (
    rec: Recommendation,
    response: 'useful' | 'impractical' | 'tried_it'
  ) => {
    try {
      await db.initialize();

      // Log feedback
      await db.feedback.add({
        id: `fb_${Date.now()}`,
        recommendation_id: rec.id,
        timestamp: new Date().toISOString(),
        response,
      });

      if (response === 'tried_it') {
        // Log to savings ledger
        await db.savings.add({
          id: `sav_${Date.now()}`,
          recommendation_id: rec.id,
          period_start: new Date().toISOString().slice(0, 10),
          period_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          estimated_savings: rec.savings_estimate.point_estimate,
          verified_actual_savings: rec.savings_estimate.lower_bound,
          basis: 'user_reported',
          verified: true,
          notes: rec.action.title[language] ?? rec.action.title.en,
        });

        // Update belief: user is flexible
        const featIdx = rec.action.appliance_category === 'cooling' ? 0 : rec.action.appliance_category === 'laundry' ? 1 : rec.action.appliance_category === 'water_heating' ? 2 : 3;
        const newBelief = updateBeliefWithFeedback(belief, featIdx, 1);
        setBelief(newBelief);

        setFeedbackToast(t('actionCompleted'));
        onActionLogged?.();
      } else if (response === 'impractical') {
        // Update belief: user is inflexible
        const featIdx = rec.action.appliance_category === 'cooling' ? 0 : rec.action.appliance_category === 'laundry' ? 1 : rec.action.appliance_category === 'water_heating' ? 2 : 3;
        const newBelief = updateBeliefWithFeedback(belief, featIdx, -1);
        setBelief(newBelief);

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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="p-3 bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Adaptive Question Modal */}
      {activeQuestion && (
        <AdaptiveQueryModal
          question={activeQuestion}
          onAnswer={handleAnswerQuestion}
          onClose={() => setActiveQuestion(null)}
        />
      )}

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('recommendationsTitle')}</h2>
              <p className="text-xs text-gray-600 mt-0.5">{t('recommendationsSubtitle')}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Case 1: Capability Gated */}
          {engineOutput?.capabilityGated && (
            <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="text-sm font-bold text-amber-900">{t('capabilityStatus')}</h3>
              <p className="text-xs text-amber-800 max-w-lg mx-auto">
                {engineOutput.gateReason}
              </p>
            </div>
          )}

          {/* Case 2: Abstention Output (Algorithm chose not to gamble) */}
          {!engineOutput?.capabilityGated && engineOutput?.outcome === 'abstain' && (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">{t('abstentionTitle')}</h3>
              <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                {t('abstentionReason')}
              </p>
            </div>
          )}

          {/* Case 3: Verified Actionable Recommendation Card */}
          {rec && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 hover:border-emerald-300 transition-colors">
              {/* Header: Title & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    {rec.action.title[language] ?? rec.action.title.en}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {rec.action.description[language] ?? rec.action.description.en}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Provenance Badge */}
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {t('provenanceSimulated')}
                  </span>
                  {/* Confidence Badge */}
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {t('conservativeLowerBoundBadge')}
                  </span>
                </div>
              </div>

              {/* Savings Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{t('expectedSavingsLabel')}</p>
                  <p className="text-xl font-bold font-mono text-gray-900">
                    ₹{rec.savings_estimate.point_estimate.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium">{t('lowerBoundLabel')}</p>
                  <p className="text-xl font-bold font-mono text-emerald-700">
                    ₹{rec.savings_estimate.lower_bound.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{t('effortLabel')}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-700 mt-1">
                    {rec.action.estimated_effort} effort
                  </p>
                </div>
              </div>

              {/* Plain-Language Explanation */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <p className="font-semibold text-blue-950 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-blue-600" />
                  Regulatory Savings Rationale
                </p>
                <p className="leading-relaxed">
                  {rec.explanation[language] ?? rec.explanation.en}
                </p>
              </div>

              {/* Model Assumptions Checklist */}
              {rec.assumptions.length > 0 && (
                <div className="space-y-1.5 text-xs text-gray-600">
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                    {t('assumptionsTitle')}
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    {rec.assumptions.map((asm, i) => (
                      <li key={i}>{asm[language] ?? asm.en}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 1-Click User Feedback Interaction Bar */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-gray-500 font-medium">Was this practical for your home?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFeedback(rec, 'useful')}
                    className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {t('feedbackUseful')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFeedback(rec, 'impractical')}
                    className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    {t('feedbackImpractical')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFeedback(rec, 'tried_it')}
                    className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5" />
                    {t('feedbackTriedIt')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
