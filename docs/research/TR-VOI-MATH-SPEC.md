# Mathematical Specification: Threshold-Aware Robust Value-of-Information (TR-VOI)
## Algorithmic Foundation of the SPARE-HEM Decision Engine

**Document Status:** Formal Mathematical Specification  
**Version:** 1.0.0  
**Date:** November 23, 2026  
**Authors:** HearthShift AI Applied Mathematics & Research Team  

---

## 1. Problem Formulation & Objective

The goal of TR-VOI is to solve the sequential household decision problem under joint consumption uncertainty $X$, latent preference uncertainty $\boldsymbol{\theta}$, discontinuous statutory tariffs $T(X)$, and cognitive/privacy query costs:

$$\max_{d \in \text{Decisions}} \mathbb{E}\left[ U(a^*(d), X, \boldsymbol{\theta}^*) - \sum_{k=1}^K \left( c_{\text{ask}} + c_{\text{priv}}(q_k) \right) \right]$$
subject to:
$$P\left( D(a, \boldsymbol{\theta}^*) > D_{\max} \;\middle|\; \mathcal{D} \right) \le \delta \quad (\delta = 0.05)$$

---

## 2. Mathematical Components

### 2.1 State Representation & Beliefs
At decision step $k$:
* **Latent Comfort Sensitivity:** $\boldsymbol{\theta} \sim \mathcal{N}(\boldsymbol{\mu}_k, \boldsymbol{\Sigma}_k)$, where $\boldsymbol{\mu}_k \in \mathbb{R}_+^M$ and $\boldsymbol{\Sigma}_k = \text{diag}(\boldsymbol{\sigma}_k^2)$.
* **Ex-Ante Consumption Uncertainty:** $X \sim \mathcal{N}(\mu_X, \sigma_X^2)$, where $\mu_X$ is the historical or meter-derived baseline and $\sigma_X = 8.0\text{ kWh}$ represents weather and calendar variance.

### 2.2 Exact Statutory Tariff Integration
Because $T(X)$ exhibits statutory cliff discontinuities (e.g. ₹478.40 cliff delta at 500/501 kWh in TNPDCL LT-1A), Taylor approximations and linearizations produce unbounded estimation errors.
TR-VOI computes expected bill savings and savings variance using 5-point Gauss-Hermite numerical quadrature:
$$\mathbb{E}_X\left[ \Delta\text{Bill}(a, X) \right] = \sum_{j=1}^5 w_j \cdot \left[ T(X_j) - T(\max(0, X_j - \Delta E(a))) \right]$$
$$\text{Var}_X\left[ \Delta\text{Bill}(a, X) \right] = \sum_{j=1}^5 w_j \cdot \left( \Delta\text{Bill}(a, X_j) - \mathbb{E}_X[\Delta\text{Bill}] \right)^2$$
where $X_j = \mu_X + \sqrt{2} \sigma_X \xi_j$, and $(w_j, \xi_j)$ are standard Gauss-Hermite quadrature weights and roots normalized to unit sum.

### 2.3 Chance-Constrained Comfort Safety
Let $\boldsymbol{\phi}(a) \in \mathbb{R}_+^M$ be the disruption feature vector of candidate action $a$.
The predictive distribution of discomfort is:
$$D(a, \boldsymbol{\theta}) \sim \mathcal{N}\left( \mu_D(a), \; \sigma_D^2(a) \right)$$
$$\mu_D(a) = \boldsymbol{\mu}_k^\top \boldsymbol{\phi}(a), \quad \sigma_D^2(a) = \boldsymbol{\phi}(a)^\top \boldsymbol{\Sigma}_k \boldsymbol{\phi}(a)$$

An action $a$ is admitted into the safe candidate action set $\mathcal{A}_{\text{safe}}$ if and only if its $(1-\delta)$-quantile satisfies the conservative comfort limit:
$$a \in \mathcal{A}_{\text{safe}} \iff \mu_D(a) + z_{1-\delta} \cdot \sigma_D(a) \le D_{\max, \text{nominal}}$$
where $z_{1-\delta} = 1.645$ for $\delta = 0.05$, and $D_{\max, \text{nominal}} = 2.0$.

### 2.4 Conservative Credible Lower-Bound Welfare
For $a \in \mathcal{A}_{\text{safe}}$:
$$\mathbb{E}[U(a)] = \mathbb{E}_X[\Delta\text{Bill}(a, X)] - \lambda_{\text{comfort}} \mu_D(a)$$
$$\text{Var}[U(a)] = \text{Var}_X[\Delta\text{Bill}(a, X)] + \lambda_{\text{comfort}}^2 \sigma_D^2(a)$$
$$Q_\alpha(U(a)) = \mathbb{E}[U(a)] - z_{1-\alpha} \sqrt{\text{Var}[U(a)]}$$
For status quo $a_0$: $Q_\alpha(U(a_0)) \equiv 0.0$.

### 2.5 Privacy-Penalized Value of Information (VOI)
For candidate clarifying question $q \in \mathcal{Q}$ targeting feature $j = \text{feat}(q)$:
1. **Current Safe Policy Value:**
   $$V_0 = \max_{a \in \mathcal{A}_{\text{safe}} \cup \{a_0\}} Q_\alpha(U(a))$$
2. **Hypothetical Posterior Safe Policy Values:**
   * If answer is $y = +1$ (flexible): $\boldsymbol{\mu}^{(+)}, \boldsymbol{\Sigma}^{(+)} \implies V(+1) = \max_{a \in \mathcal{A}_{\text{safe}}^{(+)}} Q_\alpha(U(a) \mid y=+1)$
   * If answer is $y = -1$ (inflexible): $\boldsymbol{\mu}^{(-)}, \boldsymbol{\Sigma}^{(-)} \implies V(-1) = \max_{a \in \mathcal{A}_{\text{safe}}^{(-)}} Q_\alpha(U(a) \mid y=-1)$
3. **Expected Value of Sample Information:**
   $$\text{VOI}(q) = \mathbb{E}_y[V(y)] - V_0 = 0.5 V(+1) + 0.5 V(-1) - V_0$$
4. **Net Decision Gain:**
   $$\text{NetVOI}(q) = \text{VOI}(q) - c_{\text{ask}} - c_{\text{priv}}(q)$$
   where $c_{\text{ask}} = 200\text{ paise}$ (₹2.00 annoyance cost) and $c_{\text{priv}}(q) \in [200, 500]\text{ paise}$ (₹2.00–₹5.00 privacy exposure penalty).

---

## 3. Tri-State Decision Policy Algorithm

```
Algorithm 1: Threshold-Aware Robust Value-of-Information (TR-VOI)
Input: Public household view (X_0, A, Q), Statutory tariff T, Prior N(mu, Sigma)
Parameters: K_max = 3, alpha = 0.05, delta = 0.05, c_min = 3000 paise (₹30.00)
Output: DecisionResult(action, decision_type, questions_asked)

1:  asked_queries <- []
2:  for k = 1 to K_max do
3:      Evaluate safe action set A_safe under current belief
4:      Compute prior value V_0 = max_{a in A_safe} Q_alpha(U(a))
5:      best_q <- None, max_net_voi <- 0.0
6:      for each unasked question q in Q do
7:          Compute hypothetical posteriors given y in {+1, -1}
8:          Compute hypothetical safe values V(+1) and V(-1)
9:          VOI(q) <- 0.5 * V(+1) + 0.5 * V(-1) - V_0
10:         NetVOI(q) <- VOI(q) - c_ask - c_priv(q)
11:         if NetVOI(q) > max_net_voi then
12:             max_net_voi <- NetVOI(q), best_q <- q
13:         end if
14:     end for
15:     if best_q is None or max_net_voi <= 0.0 then
16:         break  // Information gain does not justify query burden
17:     end if
18:     Observe user feedback y from asking best_q
19:     Append best_q to asked_queries
20:     if y is fatigue_dropout then break end if
21:     Update belief mu, Sigma using Bayesian likelihood
22: end for

// Final Action Selection
23: Evaluate final safe action set A_safe under posterior belief
24: a* <- argmax_{a in A_safe} Q_alpha(U(a))
25: if a* != a_0 and Q_alpha(U(a*)) > c_min then
26:     return DecisionResult(action = a*, decision_type = 'recommend', questions = asked_queries)
27: else
28:     return DecisionResult(action = a_0, decision_type = 'abstain', questions = asked_queries)
29: end if
```
