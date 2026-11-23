/**
 * HearthShift AI — Recommendation Generation Engine
 * 
 * Bridges client-side TR-VOI decision theory with UI recommendation contracts,
 * provenance badges, explicit assumption tracking, and progressive capability gating.
 * 
 * @module core/recommendation/engine
 */

import type { TariffPlan } from '../tariff/types';
import type { 
  Recommendation, 
  SavingsEstimate, 
  AdaptiveQuestion,
  DecisionOutcome
} from '../../types/contracts';
import { 
  decideTrVoi, 
  updateBeliefWithFeedback,
  type LatentPreferenceBelief,
  type TrVoiConfig
} from '../optimization/tr-voi';
import { evaluateCapabilityState, type CapabilityEvaluationInputs } from '../capabilities/policy';

export interface GenerateRecommendationsInput {
  baselineKwh: number;
  tariff: TariffPlan;
  belief?: LatentPreferenceBelief;
  askedQuestionIds?: string[];
  capabilityInputs: CapabilityEvaluationInputs;
  trVoiConfig?: TrVoiConfig;
}

export interface RecommendationEngineOutput {
  recommendation: Recommendation | null;
  outcome: DecisionOutcome;
  candidateQuestion?: AdaptiveQuestion;
  capabilityGated: boolean;
  gateReason?: string;
  belief: LatentPreferenceBelief;
}

export const DEFAULT_INITIAL_BELIEF: LatentPreferenceBelief = {
  mu: [1.0, 1.0, 1.0, 1.0],      // Nominal prior mean: moderate flexibility
  sigma: [0.4, 0.4, 0.4, 0.3],   // Standard normal prior variance
  updatedAt: new Date().toISOString(),
};

/**
 * Pure generator function producing a verified Recommendation or active question.
 */
export function generateHouseholdRecommendation(
  input: GenerateRecommendationsInput
): RecommendationEngineOutput {
  const {
    baselineKwh,
    tariff,
    belief = DEFAULT_INITIAL_BELIEF,
    askedQuestionIds = [],
    capabilityInputs,
    trVoiConfig = {},
  } = input;

  // 1. Evaluate Capability Gating
  const capabilityEval = evaluateCapabilityState(capabilityInputs);
  const permissions = capabilityEval.permissions;

  // Guard: if system cannot recommend actions, abstain with honest guidance
  if (!permissions.can_recommend_action && !permissions.can_generate_sparse_recommendations) {
    return {
      recommendation: null,
      outcome: 'abstain',
      capabilityGated: true,
      gateReason: capabilityEval.reasons[0] ?? 'Insufficient baseline evidence to generate recommendations.',
      belief,
    };
  }

  // 2. Execute TR-VOI Decision Algorithm
  const decision = decideTrVoi(baselineKwh, belief, tariff, askedQuestionIds, trVoiConfig);

  // 3. Handle Active Question Branch (EVSI > hurdle)
  if (decision.outcome === 'ask_question' && decision.candidateQuestion) {
    const cq = decision.candidateQuestion;
    const adaptiveQ: AdaptiveQuestion = {
      id: cq.id,
      text: cq.text,
      category: cq.category,
      evsi_score: decision.metadata.decisionMetricPaise / 100.0,
      burden_score: cq.burdenScore,
      privacy_score: cq.privacyCostPaise / 1000.0,
      net_value: decision.metadata.decisionMetricPaise / 100.0,
      options: [
        {
          value: 'flexible',
          label: {
            en: 'Yes / Comfortable with this',
            ta: 'ஆம் / சம்மதம்',
          },
          implied_flexibility: 'high',
        },
        {
          value: 'sensitive',
          label: {
            en: 'No / Prefer not to change this',
            ta: 'இல்லை / மாற்ற விரும்பவில்லை',
          },
          implied_flexibility: 'none',
        },
        {
          value: 'skip',
          label: {
            en: 'Not sure / Skip for now',
            ta: 'தெரியவில்லை / பின்னர் பார்க்கலாம்',
          },
          implied_flexibility: 'medium',
        },
      ],
      related_recommendation_ids: [],
    };

    return {
      recommendation: null,
      outcome: 'ask_question',
      candidateQuestion: adaptiveQ,
      capabilityGated: false,
      belief,
    };
  }

  // 4. Handle Abstention Branch (No action achieves Q_alpha > c_min safely)
  if (decision.outcome === 'abstain' || !decision.recommendedAction) {
    return {
      recommendation: null,
      outcome: 'abstain',
      capabilityGated: false,
      belief,
    };
  }

  // 5. Build Formally Certified Recommendation Object
  const act = decision.recommendedAction;
  const isCliffAvoidance = baselineKwh >= 490.0 && baselineKwh <= 520.0 && act.deltaKwh >= 5.0;

  const pointEstimateInr = Math.round((decision.pointEstimateSavingsPaise / 100.0) * 100) / 100;
  const lowerBoundInr = Math.round((decision.conservativeLowerBoundPaise / 100.0) * 100) / 100;
  const upperBoundInr = Math.round((pointEstimateInr * 1.35) * 100) / 100;

  const savingsEstimate: SavingsEstimate = {
    point_estimate: pointEstimateInr,
    lower_bound: Math.max(0.0, lowerBoundInr),
    upper_bound: upperBoundInr,
    confidence_level: 0.95,
    period: 'billing_cycle',
    currency: 'INR',
    basis: decision.basis,
  };

  const explanation = isCliffAvoidance
    ? {
        en: `High-impact cliff avoidance: Trimming ${act.deltaKwh} units protects your bi-monthly bill from crossing the 500 kWh boundary, avoiding the abrupt forfeiture of 100 free units (+₹478.40 cliff jump).`,
        ta: `மானியம் காக்கும் நடவடிக்கை: ${act.deltaKwh} யூனிட் மின்சாரத்தைக் குறைப்பதன் மூலம் 500 யூனிட் எல்லையைத் தாண்டாமல் தடுத்து, ₹478.40 உடனடி கட்டண உயர்வைத் தவிர்க்கலாம்.`,
      }
    : {
        en: `Conservative slab optimization: Expected to reduce bi-monthly consumption by ${act.deltaKwh} kWh, saving at least ₹${lowerBoundInr.toFixed(2)} under your active LT-1A tariff.`,
        ta: `மின் கட்டணச் சேமிப்பு: இரு மாதத்திற்கு சுமார் ${act.deltaKwh} யூனிட் குறைப்பதன் மூலம் குறைந்தது ₹${lowerBoundInr.toFixed(2)} உறுதியான பணச்சேமிப்பு கிடைக்கும்.`,
      };

  const rec: Recommendation = {
    id: `rec_${act.id}_${Date.now()}`,
    created_at: new Date().toISOString(),
    type: isCliffAvoidance ? 'tier_avoidance' : act.actionType === 'shift' ? 'load_shift' : 'usage_reduction',
    action: {
      title: act.title,
      description: act.description,
      appliance_category: act.applianceCategory,
      estimated_effort: act.estimatedEffort,
    },
    savings_estimate: savingsEstimate,
    assumptions: act.assumptions,
    confidence_level: decision.confidenceLevel,
    decision_outcome: 'recommend',
    explanation,
  };

  return {
    recommendation: rec,
    outcome: 'recommend',
    capabilityGated: false,
    belief,
  };
}

export { updateBeliefWithFeedback };
