# Formal Mathematical Specification: SPARE-HEM
## Sparse-feedback, Privacy-Aware, Risk-sensitive Energy Management
### Decision Theory, Probabilistic Inference, and Constrained Optimization

**Document Status:** Approved Research Specification  
**Version:** 1.0.0  
**Date:** November 22, 2026  
**Authors:** HearthShift AI Applied Mathematics & Research Team  

---

## 1. Mathematical Notation & Definitions

| Symbol | Mathematical Domain | Description |
| :--- | :--- | :--- |
| $\mathcal{T}$ | $\{1, 2, \dots, T\}$ | Discrete time intervals across billing horizon (e.g., $T=24$ or $48$ daily intervals, or $N$ days) |
| $t \in \mathcal{T}$ | Index | Time index |
| $E_t \in \mathbb{R}_+$ | $\text{kWh}$ | Aggregate household electrical energy consumed during interval $t$ |
| $E = \sum_{t=1}^T E_t$ | $\text{kWh}$ | Total billing cycle electricity consumption |
| $\boldsymbol{\theta} \in \Theta \subseteq \mathbb{R}^M$ | Parameter vector | Latent household preference and comfort sensitivity vector |
| $\pi(\boldsymbol{\theta})$ | Probability density | Belief distribution over latent preferences $\boldsymbol{\theta}$ |
| $a \in \mathcal{A}$ | Action vector | Candidate energy management action (schedule adjustment or duration reduction) |
| $\mathcal{A}_{\text{red}} \subset \mathcal{A}$ | Subset | Actions that permanently reduce energy consumption ($\Delta E > 0$) |
| $\mathcal{A}_{\text{shift}} \subset \mathcal{A}$ | Subset | Actions that shift timing without changing total energy consumed |
| $T(E)$ or $\mathcal{B}(E, \boldsymbol{\tau})$ | $\mathbb{R}_+ \to \mathbb{Z}_+$ (paise) | Deterministic piecewise tariff billing function mapping kWh to integer currency |
| $D(a, \boldsymbol{\theta})$ | $\mathbb{R}_+$ | Subjective household discomfort / inconvenience under action $a$ |
| $L(a, \boldsymbol{\theta}, E)$ | $\mathbb{R}$ | Decision loss combining monetary electricity bill, inconvenience, and risk |
| $q \in \mathcal{Q}$ | Query index | Discrete clarifying question presented to the household |
| $y \in \mathcal{Y} \cup \{\emptyset\}$ | Discrete response | Observed user feedback or non-response / timeout ($\emptyset$) |
| $\text{EVSI}(q)$ | $\mathbb{R}_+$ | Expected Value of Sample Information for query $q$ |
| $Q_\alpha(S(a))$ | $\mathbb{R}$ | Conservative $\alpha$-credible lower bound of monetary savings |
| $c_{\text{ask}}, c_{\text{priv}}$ | $\mathbb{R}_+$ | Annoyance cost per query and privacy penalty per exposed feature |

---

## 2. Feasible Action Space & Explicit Physical Separation

In real-world energy systems, **reducing electricity consumption** and **shifting electricity consumption in time** have fundamentally distinct physical, financial, and behavioral properties.

### 2.1 The Two Action Subspaces

$$\mathcal{A} = \mathcal{A}_{\text{red}} \cup \mathcal{A}_{\text{shift}} \cup \{a_0\}$$
where $a_0$ is the **null action** (do nothing / status quo).

1. **Consumption Reduction Actions ($a \in \mathcal{A}_{\text{red}}$):**
   * Physically eliminates energy usage: $\Delta E(a) > 0$.
   * Examples: Raising AC thermostat from $23^\circ\text{C}$ to $25^\circ\text{C}$ (reducing compressor run hours), turning off secondary water heater, replacing incandescent bulbs with LED.
   * **Universal Financial Property:** Always reduces gross energy consumption. Under *any* monotonic tariff (flat, tiered slab, or TOU), $\Delta \text{Cost}(a) > 0$.

2. **Load Shifting Actions ($a \in \mathcal{A}_{\text{shift}}$):**
   * Alters the time distribution of consumption without altering total energy:
     $$\sum_{t=1}^T \Delta E_t(a) = 0, \quad \text{where } \exists t_1, t_2 \text{ s.t. } \Delta E_{t_1} < 0 \text{ and } \Delta E_{t_2} > 0$$
   * Examples: Running washing machine at 06:00 instead of 19:00, scheduling EV charging during night off-peak.
   * **Tariff Invariance Invariant:**
     $$\text{If the tariff is time-independent } (\partial T / \partial t = 0), \text{ then } \forall a \in \mathcal{A}_{\text{shift}}, \; \Delta \text{Cost}(a) \equiv 0$$
     *Proof:* Under a time-independent tariff (flat rate or tiered slab such as TNPDCL LT-1A), total bill depends solely on cumulative consumption: $T(E) = T\left(\sum_{t=1}^T E_t\right)$. Since $\sum_{t=1}^T (E_t - \Delta E_t) = \sum_{t=1}^T E_t$, total $E$ is unchanged, and $T(E) - T(E) = 0$. $\blacksquare$

---

## 3. Piecewise Non-Convex Tariff Engine Formulation

The billing function $T(E)$ is non-convex, non-linear, and piecewise discontinuous. Formally, for a tiered domestic tariff with welfare subsidy rules:

$$T(E) = \mathcal{G}(E) - \mathcal{S}(E) + \mathcal{D}(E) + \mathcal{F}_{\text{fixed}}$$

where:
1. **Gross Energy Charges $\mathcal{G}(E)$:**
   $$\mathcal{G}(E) = \sum_{j=1}^{J} \max\left(0, \min(E, U_j) - L_j\right) \cdot r_j$$
   where $[L_j, U_j]$ defines the $j$-th consumption band and $r_j$ is the gross statutory slab rate in paise.
2. **Government Welfare Subsidy $\mathcal{S}(E)$:**
   $$\mathcal{S}(E) = \sum_{k=1}^K s_k(E) \cdot \mathbb{I}(E \le \Xi_k)$$
   where $\Xi_k$ is the statutory ceiling for subsidy scheme $k$.
   *Critical Discontinuity:* At the threshold $E = \Xi_k$, the indicator function drops from $1$ to $0$, creating a discrete cliff jump:
   $$\lim_{E \to \Xi_k^+} T(E) - \lim_{E \to \Xi_k^-} T(E) = s_k(\Xi_k) > 0$$
   For the **TNPDCL LT-1A May 10, 2026 Scheme**, with $\Xi = 500\text{ kWh}$:
   $$T(500) = ₹1,570.00 \quad (157{,}000\text{ paise})$$
   $$T(501) = ₹2,048.40 \quad (204{,}840\text{ paise})$$
   $$\Delta_{\text{cliff}} = ₹478.40 \quad (47{,}840\text{ paise})$$
3. **Electricity Duty $\mathcal{D}(E)$:**
   $$\mathcal{D}(E) = \left\lfloor \mathcal{G}(E) \cdot \rho_{\text{duty}} \right\rfloor$$
   where $\rho_{\text{duty}}$ is the tax rate applied to energy charges.

All internal calculations are computed in **integer paise** ($\mathbb{Z}$) to preserve deterministic arithmetic invariance.

---

## 4. Probabilistic Uncertainty & Preference Modeling

### 4.1 Consumption Uncertainty
Household consumption across an upcoming billing cycle is not a known constant; it is a random variable conditional on historical observations $\mathcal{D}_{\text{history}}$ and calendar/weather covariates $W$:
$$E \sim P(E \mid \mathcal{D}_{\text{history}}, W)$$
We model $E$ as a continuous distribution with mean $\mu_E$ and variance $\sigma_E^2$ (e.g., Log-Normal or Gaussian mixture).

Near a tariff cliff $\Xi$, the probability of crossing the cliff without intervention is:
$$p_{\text{cross}} = P(E > \Xi) = \int_{\Xi}^\infty P(E \mid \mathcal{D}_{\text{history}}, W) \, dE$$

### 4.2 Latent Preference Vector $\boldsymbol{\theta}$
Households possess latent tolerance parameters $\boldsymbol{\theta} = [\theta_{\text{AC}}, \theta_{\text{laundry}}, \theta_{\text{water}}, \theta_{\text{cost}}]^\top \in \mathbb{R}_+^M$.
We place a prior belief distribution:
$$\boldsymbol{\theta} \sim \mathcal{N}(\boldsymbol{\mu}_0, \boldsymbol{\Sigma}_0)$$

### 4.3 Inconvenience & Disutility Function
Subjective household discomfort for action $a \in \mathcal{A}$ is modeled as:
$$D(a, \boldsymbol{\theta}) = \boldsymbol{\theta}^\top \boldsymbol{\phi}(a)$$
where $\boldsymbol{\phi}(a) \in \mathbb{R}_+^M$ is an observable feature vector of the action (e.g., degrees of thermostat shift, hours of cycle postponement, duration of curtailment).

---

## 5. Decision Loss & Regret Formulation

### 5.1 Realized Decision Loss
When action $a$ is executed under true parameters $(\boldsymbol{\theta}^*, E)$, the total realized loss is:
$$L(a, \boldsymbol{\theta}^*, E) = T(E - \Delta E(a)) + \lambda D(a, \boldsymbol{\theta}^*)$$
where $\lambda > 0$ converts subjective disutility units into monetary currency (paise).

### 5.2 Optimal Full-Information Action (Oracle)
If true preferences $\boldsymbol{\theta}^*$ and consumption $E$ were known beforehand:
$$a^*(\boldsymbol{\theta}^*, E) = \arg\min_{a \in \mathcal{A}} L(a, \boldsymbol{\theta}^*, E)$$

### 5.3 Decision Regret
The regret of choosing action $a$ instead of the oracle action $a^*$ is:
$$\text{Regret}(a \mid \boldsymbol{\theta}^*, E) = L(a, \boldsymbol{\theta}^*, E) - L(a^*(\boldsymbol{\theta}^*, E), \boldsymbol{\theta}^*, E) \ge 0$$

---

## 6. Feedback Observation Model & Bayesian Update

When the system presents candidate action $a_k$ to the household, it observes discrete feedback:
$$y_k \in \{-1, 0, +1\}$$
* $y_k = +1$: Accept / Practical
* $y_k = 0$: Indifferent / Acknowledged
* $y_k = -1$: Reject / Unacceptable
* $y_k = \emptyset$: Non-response / Survey fatigue

The likelihood of acceptance is modeled via the logistic link over net perceived benefit:
$$P(y_k = +1 \mid a_k, \boldsymbol{\theta}, E) = \sigma\left( \gamma \cdot \left[ T(E) - T(E - \Delta E(a_k)) - \lambda D(a_k, \boldsymbol{\theta}) \right] \right)$$
where $\gamma > 0$ is the household rationality coefficient.

Upon observing response $y$, the posterior belief is updated via Bayes' rule:
$$\pi(\boldsymbol{\theta} \mid \mathcal{D}_{k}) \propto \pi(\boldsymbol{\theta} \mid \mathcal{D}_{k-1}) \cdot P(y_k \mid a_k, \boldsymbol{\theta})$$

For local edge and browser execution, Gaussian Assumed Density Filtering (ADF) or Laplace approximation updates the mean $\boldsymbol{\mu}_k$ and covariance $\boldsymbol{\Sigma}_k$ in $O(M^2)$ time with zero server communication.

---

## 7. The Tri-State Decision Rule: Recommend, Ask, or Abstain

Before taking an action, the agent evaluates whether it should **Recommend**, **Ask a clarifying question**, or **Abstain**.

```
                           Evaluate Belief State π(θ), P(E)
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          Calculate max EVSI(q)                       Find a* = argmin E[L(a)]
                   │                                           │
          Is max EVSI > c_ask ?                                │
          ┌────────┴────────┐                         Calculate Q_α(S(a*))
         YES                NO                                 │
          │                 │                         Is Q_α(S) > c_min ?
          ▼                 │                         ┌────────┴────────┐
     ACTION: ASK            │                        YES                NO
   (Present q*)             │                         │                 │
                            └─────────────────────────┼────────┐        │
                                                      ▼        ▼        ▼
                                                 RECOMMEND   ABSTAIN (Silence)
```

### 7.1 Expected Value of Sample Information ($\text{EVSI}$)
For candidate query $q \in \mathcal{Q}$ with possible discrete answers $y \in \mathcal{Y}_q$:

$$\text{Prior Expected Loss: } V_0 = \min_{a \in \mathcal{A}} \mathbb{E}_{\boldsymbol{\theta}, E} \left[ L(a, \boldsymbol{\theta}, E) \right]$$

$$\text{Posterior Expected Loss given } y: V(y) = \min_{a \in \mathcal{A}} \mathbb{E}_{\boldsymbol{\theta}, E \mid y} \left[ L(a, \boldsymbol{\theta}, E) \right]$$

$$\text{EVSI}(q) = V_0 - \mathbb{E}_{y \sim P(y \mid q)} \left[ V(y) \right]$$

*Interpretation:* $\text{EVSI}(q)$ represents the exact monetary reduction in expected decision loss achieved by knowing the answer to question $q$. If knowing the answer cannot change the chosen action $a^*$, then $V(y) = V_0$ for all $y$, and $\text{EVSI}(q) \equiv 0$.

### 7.2 Conservative Savings Credible Lower Bound
Let $S(a) = T(E) - T(E - \Delta E(a))$ be the uncertain monetary savings of action $a$.
Because $E$ and $\boldsymbol{\theta}$ are uncertain, $S(a)$ has an ex-ante posterior predictive distribution $P(S(a) \mid \mathcal{D})$.

We define the **conservative $\alpha$-credible lower bound** $Q_\alpha(S(a))$ as:
$$P\left( S(a) \ge Q_\alpha(S(a)) \;\middle|\; \mathcal{D} \right) = 1 - \alpha$$
For example, with $\alpha = 0.05$, there is a $95\%$ probability that the household's actual bill reduction will meet or exceed $Q_{0.05}(S(a))$.

### 7.3 Formal Decision Rules

1. **Rule 1: ASK**
   $$\text{Triggered if: } \max_{q \in \mathcal{Q}} \text{EVSI}(q) > c_{\text{ask}} + c_{\text{priv}}(q) \quad \text{AND} \quad K_{\text{queries}} < K_{\max}$$
   where $c_{\text{ask}}$ is the user annoyance threshold and $c_{\text{priv}}(q)$ is the privacy exposure cost of query $q$.
   *Action:* Present question $q^* = \arg\max_{q} [\text{EVSI}(q) - c_{\text{priv}}(q)]$.

2. **Rule 2: RECOMMEND**
   $$\text{Triggered if: } \text{Rule 1 is FALSE} \quad \text{AND} \quad Q_\alpha(S(a^*)) > c_{\text{min}}$$
   where $c_{\text{min}} > 0$ is the minimum noticeable monetary benefit (e.g., ₹50.00/month).
   *Action:* Present recommendation $a^*$ accompanied by conservative savings guarantee $Q_\alpha(S(a^*))$.

3. **Rule 3: ABSTAIN**
   $$\text{Triggered if: } \text{Neither Rule 1 nor Rule 2 is satisfied}$$
   *Action:* Remain silent. Do not disturb the household with weak or unverified recommendations.

---

## 8. Separation of Savings Estimation vs. Actual Measurement

| Concept | Mathematical Nature | When Computed | Method |
| :--- | :--- | :--- | :--- |
| **Savings Opportunity Estimate** | Ex-ante expectation $\mathbb{E}[S(a)]$ with credible lower bound $Q_\alpha(S(a))$ | Before action is taken | Posterior predictive integration over consumption distribution $P(E)$ and tariff function $T(E)$ |
| **Measured Actual Savings** | Ex-post realized counterfactual: $\Delta \mathcal{M} = T(E_{\text{counterfactual}}) - T(E_{\text{observed}})$ | After billing cycle concludes | Measured meter readings compared against calibrated baseline model |

HearthShift **never** presents an ex-ante estimate as a measured fact.

---

## 9. Conditions of Non-Identifiability and Edge Cases

1. **Collinear Appliance Usage:** If two appliances (e.g., washing machine and iron) always operate simultaneously in monthly totals, individual preference parameters $\theta_1, \theta_2$ cannot be identified without an explicit clarifying query.
2. **Zero Tariff Differentials:** Under flat-rate tariffs, $\Delta\text{Cost} = r \cdot \Delta E$. The action space $\mathcal{A}_{\text{shift}}$ is completely degenerate ($\text{EVSI} \equiv 0$ for all scheduling questions).
3. **Cliff Saturation:** If baseline consumption is deep inside a slab (e.g. $E = 300\text{ kWh} \ll 500\text{ kWh}$), small shifts have zero cliff risk, and $\text{EVSI}$ for cliff-related queries drops to zero. Conversely, as $E \to 500\text{ kWh}$, $\text{EVSI}$ spikes sharply.
