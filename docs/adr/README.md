# Architecture Decision Records (ADRs)

HearthShift AI records major engineering decisions and their trade-offs here. For current source-code boundaries and execution paths, begin with [Engineering Architecture](../ARCHITECTURE.md).

| Decision | Status | Rationale |
| --- | --- | --- |
| [ADR-001 — Local-first architecture](ADR-001-local-first-architecture.md) | Accepted | Keep raw household readings and model computation in the browser rather than transmitting telemetry to a cloud backend. |
| [ADR-002 — Deterministic billing](ADR-002-deterministic-billing.md) | Accepted | Separate statutory money arithmetic from uncertain model recommendations. |
| [ADR-003 — IndexedDB persistence](ADR-003-data-storage-indexeddb.md) | Accepted | Store structured browser-local records with export and erasure controls. |
| [ADR-004 — No remote LLM for calculations](ADR-004-no-remote-llm-for-calculations.md) | Accepted | Do not delegate deterministic charges or core model computation to remote generative APIs. |
| [ADR-005 — Progressive data resolution](ADR-005-progressive-data-resolution.md) | Accepted | Limit feature availability to what the user's actual data granularity supports. |
| [ADR-006 — Research/deployment separation](ADR-006-research-and-deployment-separation.md) | Accepted | Keep Python simulation, baselines and evaluation independent from the TypeScript client runtime. |

An accepted ADR describes a design choice, not a guarantee of security, scientific novelty, or field efficacy. See the [release limitations](../release/ALPHA-LIMITATIONS-AND-DISCLOSURES.md).
