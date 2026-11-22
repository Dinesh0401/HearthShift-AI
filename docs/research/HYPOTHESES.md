# Formal Research Hypotheses: Phase 2A / 2B
## HearthShift AI — SPARE-HEM Experimental Hypotheses

**Document Status:** Approved Research Hypotheses  
**Version:** 1.0.0  
**Date:** November 22, 2026  

---

### Hypothesis 1: Threshold-Aware Value of Information (EVSI vs. Shannon Entropy)
> **Statement:** When household electricity consumption is within a critical neighborhood of a non-linear tariff discontinuity (defined as $|E - \Xi| \le 2\sigma_E$, e.g., $460\text{--}520\text{ kWh}$ for TNPDCL LT-1A), Decision-Loss-Aware EVSI querying achieves at least a **35% reduction in decision regret** compared to Shannon parameter entropy reduction (LICA baseline) under identical interaction query budgets ($K \le 3$).  
> **Theoretical Rationale:** Shannon entropy reduces uncertainty over all parameters equally, wasting queries on appliances whose scheduling cannot alter the cliff outcome. Decision-aware EVSI measures the expected reduction in decision loss under the non-linear billing function $T(E)$, prioritizing the specific appliance flexibility that prevents crossing the ₹478.40 cliff.  
> **Verification Metric:** Mean Decision Regret $\mathbb{E}[\text{Regret}]$ across 100 seeded simulated households with $E \in [470, 510]\text{ kWh}$.

---

### Hypothesis 2: False-Positive Recommendation Suppression via Abstention
> **Statement:** Conditioning recommendation issuance on a conservative $\alpha$-credible lower bound ($Q_{0.05}(S(a)) > c_{\text{min}}$) reduces false-positive recommendations (defined as recommendations where realized household loss increases: $L(a) > L(a_0)$) by at least **50%** compared to point-estimate expectation maximization ($\mathbb{E}[S(a)] > 0$), while preserving $\ge 80\%$ of true positive savings.  
> **Theoretical Rationale:** When household preferences $\boldsymbol{\theta}$ have high variance, point estimates suffer from the optimizer's curse. A conservative lower bound acts as a risk-averse shield against user dissatisfaction.  
> **Verification Metric:** False Positive Recommendation Rate $\text{FPR} = \frac{\#\{a \text{ recommended} \mid L(a) > L(a_0)\}}{\#\{a \text{ recommended}\}}$.

---

### Hypothesis 3: Invariance Preservation under Time-Independent Tariffs
> **Statement:** Under flat-rate and standard tiered slab tariffs (where rates depend purely on cumulative kWh and not on time-of-day), SPARE-HEM automatically proves that $\text{EVSI}(q) \equiv 0$ for all time-shifting questions, resulting in **zero unnecessary shifting queries and zero shifting recommendations**, while existing HEMS algorithms produce fictitious savings and unnecessary shifting burden.  
> **Theoretical Rationale:** When $\partial T / \partial t = 0$, $\Delta\text{Cost} = 0$ for any action in $\mathcal{A}_{\text{shift}}$, so shifting creates discomfort without financial gain.  
> **Verification Metric:** Number of time-shifting recommendations emitted under TNPDCL LT-1A (expected: exactly 0).

---

### Hypothesis 4: Sample-Efficient Active Learning under Non-Stationary Preferences
> **Statement:** Under an interaction budget of at most 3 questions per bi-monthly billing cycle, an Assumed Density Filtering (ADF) online Bayesian learner with preference drift parameter $\tau_{\text{drift}} > 0$ tracks seasonal preference shifts (e.g. AC comfort priority increasing during peak summer months) with $\le 15\%$ tracking lag compared to an omniscient online tracker.  
> **Verification Metric:** Tracking Error $\|\hat{\boldsymbol{\mu}}_t - \boldsymbol{\theta}_t^*\|_2$ over 6 simulated consecutive billing cycles with seasonal drift.
