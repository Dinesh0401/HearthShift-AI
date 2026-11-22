# Baseline Evaluation Matrix: Phase 2A
## HearthShift AI — Algorithmic Comparison Specifications

**Document Status:** Approved Baseline Specification  
**Version:** 1.0.0  
**Date:** November 22, 2026  

---

## 1. Five Prescribed Research Baselines

To rigorously benchmark SPARE-HEM, we define and implement five baseline algorithms:

```
                           Elicitation Strategy
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
  No Queries                  Fixed Survey                Active Queries
       │                            │                            │
   [B1] Rule-Based             [B2] Static Survey       ┌────────┴────────┐
                                                        ▼                 ▼
                                                   [B3] Entropy     [B4] Linear EVSI
                                                    (LICA proxy)
                                                                 │
                                                       [B5] Oracle Reference
                                                       (Upper bound ceiling)
```

---

### B1: No-Query Heuristic Rule Advisor
* **Description:** Represents typical commercial and utility rule-of-thumb tips (e.g., "Set AC to 25°C", "Run laundry early in the morning").
* **Elicitation:** Zero queries ($K=0$). Completely passive.
* **Decision Mechanism:** Static threshold rules triggered whenever consumption exceeds average historical levels.
* **Failure Mode:** Completely blind to household preferences. Recommends unacceptable actions, producing high discomfort and rejection.

---

### B2: Fixed Upfront Survey Advisor
* **Description:** Represents standard onboarding questionnaires in smart home apps.
* **Elicitation:** Asks a static, fixed battery of $K$ questions upfront during initial onboarding (e.g. $K=5$ questions about laundry, AC, and dishwashing habits).
* **Decision Mechanism:** Estimates fixed preference point estimate $\hat{\boldsymbol{\theta}} = \mathbb{E}[\boldsymbol{\theta} \mid y_{1:K}]$ and solves single static optimization.
* **Failure Mode:** High initial survey fatigue. Cannot adapt to seasonal shifts or unexpected tariff cliff proximity.

---

### B3: Entropy / Information-Gain Active Learning (LICA Proxy)
* **Citation / Prior Art:** Proxy implementation of the active preference learning core of *LICA (ScienceDirect, 2026)*.
* **Elicitation:** Selects queries using **Shannon entropy reduction** over preference parameters:
  $$q^*_{\text{entropy}} = \arg\max_{q \in \mathcal{Q}} \mathcal{H}(\boldsymbol{\theta}) - \mathbb{E}_{y} [\mathcal{H}(\boldsymbol{\theta} \mid y, q)]$$
* **Decision Mechanism:** Maximizes parameter information gain, then optimizes schedule using current posterior mean $\hat{\boldsymbol{\theta}}$.
* **Failure Mode:** Queries parameters with high mathematical variance even if those parameters have zero economic consequence under the specific tariff or current consumption range.

---

### B4: Standard Linear EVSI Advisor
* **Description:** Classical Expected Value of Sample Information applied to an energy scheduling model assuming constant or linear pricing.
* **Elicitation:** Selects questions using $\text{EVSI}$ computed under a simplified linear tariff approximation $T(E) \approx r \cdot E$.
* **Decision Mechanism:** Solves expected loss minimization under the linear approximation.
* **Failure Mode:** Completely misses non-convex tariff thresholds and discontinuous welfare cliffs (e.g. ₹478.40 cliff at 501 kWh), drastically under-valuing questions that could prevent crossing a major cliff.

---

### B5: Full-Information Oracle Reference
* **Description:** Theoretical performance ceiling.
* **Elicitation:** Zero queries needed. Perfect access to hidden ground truth $\boldsymbol{\theta}^*$ and true consumption realization $E^*$.
* **Decision Mechanism:** Evaluates exact oracle action:
  $$a^* = \arg\min_{a \in \mathcal{A}} L(a, \boldsymbol{\theta}^*, E^*)$$
* **Role in Benchmark:** Normalization ceiling (100% policy value) to measure what fraction of optimal value each algorithm achieves.

---

## 2. Quantitative Baseline Summary Table

| Metric / Property | B1: Rule-Based | B2: Fixed Survey | B3: Entropy (LICA Proxy) | B4: Linear EVSI | B5: Oracle | **SPARE-HEM** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Active Queries** | 0 | Fixed $K$ (onboarding) | $K$ (entropy greedy) | $K$ (linear EVSI) | 0 (omniscient) | **Adaptive $\le K_{\max}$** |
| **Tariff Cliff Awareness** | None | None | None | None | Perfect | **Explicit Non-Convex EVSI** |
| **Abstention Support** | No | No | No | No | N/A | **Yes ($Q_\alpha(S) < c_{\text{min}}$)** |
| **Comfort Violation Risk** | High | Medium | Medium-Low | Medium | Zero | **Risk-Bounded ($Q_{0.05}$)** |
| **Privacy Exposure** | Minimal | Medium | High | Low | N/A | **Zero-Telemetry Local Edge** |
