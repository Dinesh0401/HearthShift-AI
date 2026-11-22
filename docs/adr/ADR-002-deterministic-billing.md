# ADR-002: Deterministic Billing Calculator with Versioned Tariff Schedules

## Status
Accepted

## Date
2026-11-22

## Context
Electricity tariffs are complex, legalistic, piecewise mathematical functions. For example, the Tamil Nadu (TANGEDCO LT-1A) domestic tariff features bi-monthly tiered consumption slabs (e.g., 0-100 units free, 101-200 at ₹2.25/unit, 201-500 at ₹4.50/unit, and >500 at ₹6.00/unit), plus fixed charges, electricity duty, and non-telescopic threshold resets. Similarly, commercial and international tariffs feature Time-of-Use (TOU) windows and seasonal multipliers.

Many AI applications attempt to estimate bills using machine learning regression or prompt-engineered LLMs. This produces hallucinations, arithmetic errors, and uncalibrated savings claims that destroy user trust when the physical bill arrives.

## Decision
We mandate that:
1. All billing and tariff arithmetic must be implemented as **pure, deterministic TypeScript functions** with zero stochastic elements, zero ML approximations, and zero LLM calls.
2. Every regional tariff is defined as a formal, versioned JSON schema object (`TariffDefinition`) including an official regulatory order URL, effective start date, and expiry date.
3. Every billing calculation is auditable to the exact currency subunit (paisa/cent) and validated against a suite of verified regulatory test fixtures.

## Consequences
### Positive
* 100% reproducible and auditable billing calculations.
* Sub-millisecond execution times for 8,760 hourly calculations.
* Full testability with standard unit-testing frameworks (Vitest).

### Negative
* New tariffs cannot be automatically ingested from arbitrary unstructured text without human or validated parsing.
* Tariff structures must be manually codified and maintained when utilities issue revised tariff orders.

## Alternatives Considered
* *LLM-driven Bill Parsing & Estimation:* Rejected due to documented arithmetic unreliability, high latency, cost, and hallucination risks.
* *Generalized Average Per-Unit Rate Estimation:* Rejected because applying an average rate (e.g. ₹5/kWh) obscures the high marginal value of avoiding upper slab thresholds.
