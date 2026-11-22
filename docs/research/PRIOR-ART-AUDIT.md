# Prior-Art Audit & Novelty Investigation
## HearthShift AI — SPARE-HEM Research Literature Review (through November 2026)

**Document Status:** Approved Research Audit  
**Version:** 1.0.0  
**Date:** November 22, 2026  
**Scope:** Active Preference Learning, Home Energy Management Systems (HEMS), Expected Value of Information, Privacy-Preserving Edge AI, and Nonlinear Tariff Optimization  

---

## 1. Executive Summary: The Novelty Reality Check

Combining Artificial Intelligence, smart meter data, on-device execution, and energy-saving recommendations is **not novel**. Commercial products (Sense, Emporia Energy, Schneider Wiser) and numerous academic papers published through 2026 already perform load disaggregation, edge learning, and schedule recommendations.

Furthermore, recent 2026 publications have directly targeted active preference elicitation and privacy-aware home energy scheduling:
1. **LICA (ScienceDirect, 2026):** A multi-agent framework for household electricity scheduling under real-time pricing using active questioning.
2. **LLM-Enhanced HEMS (ScienceDirect, 2026):** Investigates dynamic user preference elicitation and hierarchical data sharing.

Therefore, HearthShift cannot and will not claim broad novelty on "AI + Smart Meter + Privacy + Active Questioning". 

Instead, our research differentiation is formulated around a narrow, specific, and mathematically testable question:

> **Core Research Question:**  
> *Can a locally executed household energy decision system use uncertain electricity measurements, nonlinear tariffs, and sparse preference feedback to decide when to recommend an action, ask one question, or abstain—while minimizing financial regret, privacy exposure, and user inconvenience?*

---

## 2. Comprehensive Related-Work Comparison Matrix

The table below provides a rigorous comparison across representative state-of-the-art approaches and SPARE-HEM:

| Dimension | Classical NILM / Rule-Based (e.g. Sense, Emporia) | MILP Schedule Optimization (e.g., Althaher et al.) | LICA Multi-Agent Framework (ScienceDirect, 2026) | LLM-Enhanced HEMS (ScienceDirect, 2026) | **SPARE-HEM (This Work)** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Execution Architecture** | Cloud-based ingestion | Centralized or server gateway | Local / Edge agent | Cloud LLM + Local aggregator | **100% Local-first browser/edge runtime** |
| **Preference Model** | Static heuristics (none) | Fully known cost function | Latent constraint boundaries | Semantic NL dialogue | **Probabilistic belief distribution $\pi(\theta)$** |
| **Query Strategy** | None / One-time onboarding | None (assumes full info) | Parameter entropy reduction | Conversational dialogue | **Decision-Loss $\text{EVSI} - c_{\text{ask}} - c_{\text{priv}}$** |
| **Tariff Support** | Flat or simplified TOU | Linear TOU / Real-Time Pricing (RTP) | Continuous real-time pricing (RTP) | Generic linear rates | **Non-convex, discontinuous piecewise slabs + TOU** |
| **Tariff Cliff Awareness** | Completely unaware | Continuous approximations only | Unaware (focuses on time shifting under RTP) | Unaware | **Explicit discontinuity audit (e.g. ₹478.40 cliff at 501 kWh)** |
| **Decision Space** | "Turn off appliance" | Continuous schedule $x^*$ | Discrete schedule $x^*$ | Natural language prompt | **Tri-state: Recommend / Ask / Abstain** |
| **Savings Formulation** | Single point estimate | Cost difference $\Delta C$ | Utility difference $\Delta U$ | Estimated percentage | **Conservative lower bound $Q_\alpha(S)$ + provenance** |
| **Interaction Burden** | N/A | Ignored | Bounded query count | Conversational fatigue | **Rigorous budget $K \le 3$/cycle, penalty $c_{\text{ask}}$** |
| **Physical Integrity** | Conflates Watts/kWh | Explicit physics | Appliance models | Hallucination prone | **Trapezoidal integration + reset discontinuity gating** |

---

## 3. Deep-Dive Analysis of Closest Prior Art

### 3.1 LICA: Multi-Agent Household Electricity Scheduling (2026)
* **Citation:** *LICA: A multi-agent framework for household electricity scheduling under real-time pricing*, Applied Energy / ScienceDirect, 2026.
* **What it already solves:**
  * Uses active questioning to learn household comfort boundaries for shiftable appliances (e.g., washing machine, EV).
  * Balances interaction frequency with electricity cost reduction under real-time pricing (RTP).
* **What remains uncertain or unaddressed:**
  * **Objective of Questioning:** LICA selects questions using **parameter uncertainty reduction (Shannon entropy)**. In decision theory, parameter uncertainty reduction is sub-optimal because it queries parameters that have zero impact on the optimal action (e.g., resolving whether a household dislikes running the dishwasher at 3 AM vs 4 AM when both hours have identical off-peak rates).
  * **Tariff Structure:** LICA assumes smooth, continuous, time-varying real-time pricing (RTP). It does not model non-smooth, non-convex, discontinuous tiered slab structures (such as TNPDCL LT-1A) where consumption across a bi-monthly cycle creates catastrophic financial cliffs.
  * **Abstention Option:** LICA forces an appliance schedule decision $x^*$ even when preference uncertainty is high, risking significant user frustration and override.
  * **Privacy Telemetry:** LICA requires appliance-level sub-metering or disaggregated load traces.

### 3.2 LLM-Enhanced HEMS with Dynamic Preference Elicitation (2026)
* **Citation:** *Large language model-enhanced home energy management with dynamic user preference elicitation and hierarchical data-sharing*, Energy and AI / ScienceDirect, 2026.
* **What it already solves:**
  * Employs language models to parse conversational user feedback into preference weights.
  * Proposes hierarchical data sharing between private edge units and cloud aggregators.
* **What remains uncertain or unaddressed:**
  * **Privacy Leakage:** Conversational prompts sent to remote LLMs expose intimate household patterns (occupancy, sleep schedules, appliance use).
  * **Arithmetic Hallucination:** LLMs cannot deterministically compute complex tariff slabs, duties, and subsidies in integer paise.
  * **No Mathematical Decision Bounds:** Lacks statistical confidence intervals or Expected Value of Sample Information proofs.

### 3.3 Bayesian Active Preference Learning & Decision-Theoretic EVSI
* **Foundational Literature:** Howard (1966), Raiffa & Schlaifer (1961), Houlsby et al. (Bayesian Active Learning by Disagreement, 2011), Biyik et al. (Active Preference Learning from Discrete Feedback, 2019).
* **What it solves:** Expected Value of Sample Information ($\text{EVSI}$) is the gold standard for determining whether an experiment or measurement is worth its cost before executing it:
  $$\text{EVSI}(q) = \mathbb{E}_y \left[ \min_a \mathbb{E}_{\theta \mid y}[L(a, \theta)] \right] - \min_a \mathbb{E}_\theta[L(a, \theta)]$$
* **What remains unaddressed in HEMS:**
  * Existing EVSI formulations focus on linear or convex decision loss functions (e.g., clinical trials, oil exploration).
  * Applying EVSI to non-linear, discontinuous piecewise utility tariffs with tri-state decisions (Recommend / Ask / Abstain) under a zero-telemetry local edge constraint has not been rigorously studied or benchmarked.

---

## 4. Technical Novelty Assessment & Research Scope

To ensure scientific honesty, we categorize every component of SPARE-HEM into one of three tiers:

### Tier 1: Established / Prior Art (No Novelty Claimed)
* **Bayesian parameter updates from discrete feedback:** Established (Biyik et al., Chu & Ghahramani).
* **Expected Value of Sample Information ($\text{EVSI}$):** Established decision theory (Howard 1966).
* **Trapezoidal numerical integration of electrical power:** Standard numerical analysis ($E = \int P \, dt$).
* **Deterministic piecewise tariff calculation:** Standard software engineering.
* **On-device browser storage via IndexedDB:** Standard web platform capability.

### Tier 2: Incremental Engineering Adaptations
* **Source-aware dynamic gap limit for power integration:** Adapting integration thresholds based on sample interval distribution ($\max(300\text{s}, 2.5 \times \Delta t_{\text{nominal}})$).
* **Discontinuity isolation without synthetic interpolation:** Marking meter reset boundaries rather than fabricating consumption.
* **Progressive capability mode gating:** Explicitly decoupling basic monthly bill tracking from interval load curves and load shifting.

### Tier 3: Candidate Research Contributions (To be experimentally evaluated in Phase 2)
1. **Decision-Aware vs. Information-Gain Elicitation under Discontinuous Tariffs:**
   * Demonstrating that optimizing queries for Expected Value of Information ($\text{EVSI}$) specifically targeting tariff discontinuity cliffs requires significantly fewer questions and achieves lower decision regret than Shannon entropy reduction (LICA baseline).
2. **Calibrated Tri-State Policy (Recommend / Ask / Abstain):**
   * Formulating an optimal abstention boundary: when expected savings cannot be proven positive at credible lower bound ($Q_\alpha(S) < c_{\text{min}}$) and query value is less than annoyance cost ($\text{EVSI} \le c_{\text{ask}}$), the assistant remains silent, preventing user fatigue.
3. **Time-Independent Tariff Invariance Invariant:**
   * Formalizing the proof and experimental demonstration that load shifting under flat/slab tariffs yields zero cost reduction ($\Delta \text{Cost} \equiv 0$), and proving that decision-aware agents correctly suppress shifting advice where existing HEMS produce phantom savings.

---

## 5. Required Baseline Comparisons for Phase 2

To test these candidate contributions rigorously, the research simulator must compare SPARE-HEM against five distinct baselines:
* **B1 (No-Query Heuristic Advisor):** Static rules, zero user queries.
* **B2 (Fixed Upfront Survey):** Static $K$-question onboarding, static preference point estimate.
* **B3 (Entropy / Information-Gain Active Learning — LICA Proxy):** Selects queries to maximize Shannon entropy reduction over preference parameters.
* **B4 (Standard Linear EVSI):** Classic Value of Information assuming linear electricity rates.
* **B5 (Full-Information Oracle Reference):** Theoretical upper bound with complete access to hidden ground truth $\theta^*$.
