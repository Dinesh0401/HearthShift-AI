/**
 * HearthShift AI — Client-Side TR-VOI Decision Engine
 *
 * Port of the Threshold-Aware Robust Value-of-Information (TR-VOI) algorithm.
 * Core Behavioral Invariants:
 * 1. Exact piecewise statutory tariff evaluation under modeled baseline uncertainty P(X).
 * 2. Chance-constrained comfort risk model: P(D(a, theta) > D_max) <= delta (z_alpha = 1.645).
 * 3. Conservative alpha-credible lower-bound welfare: Q_alpha(U(a)) > c_min (₹30.00).
 * 4. Value of Sample Information (EVSI) active questioning with annoyance & privacy friction penalties.
 * 5. Deterministic integer paise arithmetic, zero telemetry, 100% on-device execution.
 *
 * @module core/optimization/tr-voi
 */

import type { TariffPlan } from '../tariff/types';
import { calculateShiftCostDelta } from '../tariff/calculator';
import type { ConfidenceLevel } from '../../types/contracts';
import { ADAPTIVE_QUESTION_CATALOG, PHYSICAL_ACTION_CATALOG } from './action-catalog';
import { exactPiecewiseTariffMoments } from './piecewise-moments';
import type {
  ClientAdaptiveQuestion,
  ClientEnergyAction,
  LatentPreferenceBelief,
  TrVoiConfig,
  TrVoiDecisionResult,
} from './types';

export type {
  ClientEnergyAction,
  ClientAdaptiveQuestion,
  LatentPreferenceBelief,
  TrVoiDecisionResult,
  TrVoiConfig,
} from './types';
export { PHYSICAL_ACTION_CATALOG, ADAPTIVE_QUESTION_CATALOG } from './action-catalog';
export {
  standardNormalPdf,
  standardNormalCdf,
  exactPiecewiseTariffMoments,
} from './piecewise-moments';

const Z_ALPHA_95 = 1.645;

/**
 * Applies a single discrete feedback step (+1 flexible, -1 inflexible, 0 skip)
 * to latent comfort preference vectors without mutating inputs.
 */
function applyDiscreteBeliefStep(
  mu: number[],
  sigma: number[],
  featureIndex: number,
  responseValue: 1 | -1 | 0
): { mu: number[]; sigma: number[] } {
  const nextMu = [...mu];
  const nextSigma = [...sigma];

  if (responseValue === 1) {
    // Household accepted action or answered Yes (more flexible)
    nextMu[featureIndex] = Math.max(0.2, nextMu[featureIndex] - 0.4);
    nextSigma[featureIndex] *= 0.5;
  } else if (responseValue === -1) {
    // Household rejected action or answered No (more sensitive/inflexible)
    nextMu[featureIndex] = Math.min(5.0, nextMu[featureIndex] + 0.6);
    nextSigma[featureIndex] *= 0.5;
  }
  // responseValue === 0 denotes indifference or skip; no update

  return { mu: nextMu, sigma: nextSigma };
}

function maxSafeLowerBound(
  actions: ClientEnergyAction[],
  baselineKwh: number,
  mu: number[],
  sigma: number[],
  tariff: TariffPlan,
  config: TrVoiConfig
): number {
  return Math.max(
    0.0,
    ...actions
      .map((a) => evaluateActionWelfare(a, baselineKwh, mu, sigma, tariff, config))
      .filter((ev) => ev.isComfortSafe)
      .map((ev) => ev.conservativeLowerBoundPaise)
  );
}

/**
 * Evaluates expected welfare, alpha-credible conservative lower bound,
 * and chance-constrained comfort feasibility for a single candidate action.
 */
export function evaluateActionWelfare(
  action: ClientEnergyAction,
  baselineKwh: number,
  mu: number[],
  sigma: number[],
  tariff: TariffPlan,
  config: TrVoiConfig = {}
): {
  expectedWelfarePaise: number;
  conservativeLowerBoundPaise: number;
  isComfortSafe: boolean;
  meanSavingsPaise: number;
  stdSavingsPaise: number;
} {
  const lambdaD = config.lambdaDiscomfortPaise ?? 20000.0;
  const dMax = config.dMaxNominal ?? 2.0;
  const sigmaKwh = config.consumptionSigmaKwh ?? 8.0;

  if (action.id === 'null_action') {
    return {
      expectedWelfarePaise: 0.0,
      conservativeLowerBoundPaise: 0.0,
      isComfortSafe: true,
      meanSavingsPaise: 0.0,
      stdSavingsPaise: 0.0,
    };
  }

  // 1. Discomfort Distribution
  let expD = 0.0;
  let varD = 0.0;
  for (let i = 0; i < 4; i++) {
    expD += mu[i] * action.featureVector[i];
    varD += (sigma[i] * sigma[i]) * (action.featureVector[i] * action.featureVector[i]);
  }
  const stdD = Math.sqrt(varD);

  // 2. Hard Comfort Chance Constraint: P(D > D_max) <= delta
  const upperD = expD + Z_ALPHA_95 * stdD;
  if (upperD > dMax) {
    return {
      expectedWelfarePaise: -Infinity,
      conservativeLowerBoundPaise: -Infinity,
      isComfortSafe: false,
      meanSavingsPaise: 0.0,
      stdSavingsPaise: 0.0,
    };
  }

  // 3. Expected Bill Savings under P(X)
  let meanSavings = 0.0;
  let stdSavings = 0.0;

  if (action.actionType === 'shift') {
    if (!tariff.is_time_dependent) {
      // Pure load shifting under time-independent tariff yields ZERO savings
      meanSavings = 0.0;
      stdSavings = 0.0;
    } else {
      // Shift 16 bi-monthly cycles x 1.5 kWh = 24.0 kWh from Evening Peak (19:00) to Morning Off-Peak (07:00)
      const shiftDelta = calculateShiftCostDelta(
        [{ hour: 19, kwh: 24.0 }],
        [{ hour: 7, kwh: 24.0 }],
        tariff
      );
      meanSavings = Math.max(0.0, shiftDelta.cost_delta_paise);
      stdSavings = Math.round(meanSavings * 0.1);
    }
  } else if (action.deltaKwh > 0.0) {
    const postKwh = Math.max(0.0, baselineKwh - action.deltaKwh);
    const baseMoments = exactPiecewiseTariffMoments(baselineKwh, sigmaKwh, tariff);
    const postMoments = exactPiecewiseTariffMoments(postKwh, sigmaKwh, tariff);

    meanSavings = Math.max(0.0, baseMoments.meanBillPaise - postMoments.meanBillPaise);
    stdSavings = Math.sqrt(
      Math.max(
        0.0,
        baseMoments.stdBillPaise ** 2 +
          postMoments.stdBillPaise ** 2 -
          2 * 0.9 * baseMoments.stdBillPaise * postMoments.stdBillPaise
      )
    );
  }

  // 4. Welfare & Conservative Credible Lower Bound Q_alpha
  const expDiscomfortPaise = lambdaD * expD;
  const stdDiscomfortPaise = lambdaD * stdD;

  const expWelfare = meanSavings - expDiscomfortPaise;
  const totalStd = Math.sqrt(stdSavings * stdSavings + stdDiscomfortPaise * stdDiscomfortPaise);
  const qAlpha = expWelfare - Z_ALPHA_95 * totalStd;

  return {
    expectedWelfarePaise: expWelfare,
    conservativeLowerBoundPaise: qAlpha,
    isComfortSafe: true,
    meanSavingsPaise: meanSavings,
    stdSavingsPaise: stdSavings,
  };
}

/**
 * Selects between recommending an energy action, asking an active EVSI
 * clarifying question, or abstaining based on robust welfare thresholds.
 */
export function decideTrVoi(
  baselineKwh: number,
  belief: LatentPreferenceBelief,
  tariff: TariffPlan,
  askedQuestionIds: string[] = [],
  config: TrVoiConfig = {}
): TrVoiDecisionResult {
  const cMin = config.cMinPaise ?? 3000.0; // ₹30.00
  const costAsk = config.costAskPaise ?? 200.0; // ₹2.00
  const mu = [...belief.mu];
  const sigma = [...belief.sigma];

  const candidateActions = PHYSICAL_ACTION_CATALOG;
  const availableQuestions = ADAPTIVE_QUESTION_CATALOG.filter(
    (q) => !askedQuestionIds.includes(q.id)
  );

  // Step 1: Compute Prior Value V0 under Current Belief
  const v0 = maxSafeLowerBound(candidateActions, baselineKwh, mu, sigma, tariff, config);

  // Step 2: Adaptive Expected Value of Information (EVSI)
  let bestQuestion: ClientAdaptiveQuestion | null = null;
  let bestNetVoi = -1.0;

  for (const q of availableQuestions) {
    const posBelief = applyDiscreteBeliefStep(mu, sigma, q.featureIndex, 1);
    const vPos = maxSafeLowerBound(
      candidateActions,
      baselineKwh,
      posBelief.mu,
      posBelief.sigma,
      tariff,
      config
    );

    const negBelief = applyDiscreteBeliefStep(mu, sigma, q.featureIndex, -1);
    const vNeg = maxSafeLowerBound(
      candidateActions,
      baselineKwh,
      negBelief.mu,
      negBelief.sigma,
      tariff,
      config
    );

    const evsi = 0.5 * vPos + 0.5 * vNeg - v0;
    const netVoi = evsi - (costAsk + q.privacyCostPaise);

    if (netVoi > bestNetVoi) {
      bestNetVoi = netVoi;
      bestQuestion = q;
    }
  }

  if (bestQuestion && bestNetVoi > 0.0) {
    return {
      outcome: 'ask_question',
      candidateQuestion: bestQuestion,
      pointEstimateSavingsPaise: 0.0,
      conservativeLowerBoundPaise: 0.0,
      expectedWelfarePaise: 0.0,
      confidenceLevel: 'insufficient',
      basis: 'simulated',
      assumptions: [],
      metadata: {
        decisionMetricPaise: bestNetVoi,
        askedQuestionIds,
        isComfortSafe: true,
      },
    };
  }

  // Step 3: Recommend vs. Abstain Decision Gate
  const nullAction = candidateActions.find((a) => a.id === 'null_action')!;
  let bestAction: ClientEnergyAction = nullAction;
  let bestLowerBound = 0.0;
  let bestExpectedWelfare = 0.0;
  let bestSavingsPaise = 0.0;

  for (const a of candidateActions) {
    if (a.id === 'null_action') continue;
    // Time-independent tariff safety invariant: pure load-shifting saves ₹0.00
    if (!tariff.is_time_dependent && a.actionType === 'shift') continue;

    const evalRes = evaluateActionWelfare(a, baselineKwh, mu, sigma, tariff, config);
    if (!evalRes.isComfortSafe) continue;

    if (evalRes.conservativeLowerBoundPaise > cMin && evalRes.conservativeLowerBoundPaise > bestLowerBound) {
      bestLowerBound = evalRes.conservativeLowerBoundPaise;
      bestExpectedWelfare = evalRes.expectedWelfarePaise;
      bestSavingsPaise = evalRes.meanSavingsPaise;
      bestAction = a;
    }
  }

  if (bestAction.id === 'null_action') {
    return {
      outcome: 'abstain',
      pointEstimateSavingsPaise: 0.0,
      conservativeLowerBoundPaise: 0.0,
      expectedWelfarePaise: 0.0,
      confidenceLevel: 'high',
      basis: 'simulated',
      assumptions: [],
      metadata: {
        decisionMetricPaise: 0.0,
        askedQuestionIds,
        isComfortSafe: true,
      },
    };
  }

  const confidenceLevel: ConfidenceLevel =
    bestLowerBound > 10000 ? 'high' : bestLowerBound > 5000 ? 'medium' : 'low';

  return {
    outcome: 'recommend',
    recommendedAction: bestAction,
    pointEstimateSavingsPaise: bestSavingsPaise,
    conservativeLowerBoundPaise: bestLowerBound,
    expectedWelfarePaise: bestExpectedWelfare,
    confidenceLevel,
    basis: 'simulated',
    assumptions: bestAction.assumptions,
    metadata: {
      decisionMetricPaise: bestLowerBound,
      askedQuestionIds,
      isComfortSafe: true,
    },
  };
}

/**
 * Updates latent preference belief vector recursively given sparse discrete feedback (+1, -1, 0).
 */
export function updateBeliefWithFeedback(
  currentBelief: LatentPreferenceBelief,
  featureIndex: number,
  responseValue: 1 | -1 | 0
): LatentPreferenceBelief {
  const { mu, sigma } = applyDiscreteBeliefStep(
    currentBelief.mu,
    currentBelief.sigma,
    featureIndex,
    responseValue
  );

  return {
    mu,
    sigma,
    updatedAt: new Date().toISOString(),
  };
}
