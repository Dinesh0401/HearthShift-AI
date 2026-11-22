# ADR-004: Prohibition of Remote LLMs for Mathematical & Optimization Operations

## Status
Accepted

## Date
2026-11-22

## Context
Generative AI and Large Language Models (LLMs) are frequently misapplied to numerical tasks such as bill calculation, interval energy load shifting, and statistical optimization. In energy management:
1. LLMs lack deterministic arithmetic guarantees and frequently hallucinate savings.
2. Sending interval energy series to remote LLM APIs directly breaches our core privacy mandate by transmitting domestic behavioral data to external third parties.
3. API latency (1-5 seconds) and recurrent token costs make real-time counterfactual simulation impractical.

## Decision
We enforce a strict architectural rule:
1. **Zero Remote LLM Calls for Numerical Logic:** All tariff calculations, cost simulations, EVSI calculations, and recommendation generation are executed strictly by deterministic TypeScript / WebAssembly algorithms locally in the client.
2. **Constrained Role for Language Models:** If an on-device lightweight LLM or localized template engine is used in future versions, its role is strictly restricted to formatting natural-language explanations and localization strings. It is never supplied raw energy data or entrusted with mathematical calculations.

## Consequences
### Positive
* Perfect arithmetic correctness and mathematical auditability.
* Absolute zero leakage of private telemetry to cloud AI providers.
* Zero external API cost and instantaneous local execution.

### Negative
* Recommendations and explanations must be generated from structured templates rather than open-ended freeform generative prose.

## Alternatives Considered
* *Hybrid Local Optimization with Cloud LLM Summarization:* Rejected because sending summary statistics (peak hours, total usage) still leaks lifestyle indicators and creates network dependencies.
