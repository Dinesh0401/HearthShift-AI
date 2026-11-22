# Architecture Decision Records (ADRs)
## HearthShift AI — Engineering & Algorithmic Decisions

| ADR | Title | Status | Date | Decision Summary |
| :--- | :--- | :---: | :---: | :--- |
| **[ADR-001](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/ADR-001-local-first-architecture.md)** | Local-First Architecture | **Accepted** | 2026-11-22 | Process all raw household energy readings client-side with zero telemetry. |
| **[ADR-002](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/ADR-002-deterministic-billing.md)** | Deterministic Billing Calculator | **Accepted** | 2026-11-22 | Implement pure deterministic tariff functions; zero LLM/ML in billing arithmetic. |
| **[ADR-003](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/ADR-003-data-storage-indexeddb.md)** | IndexedDB via Dexie.js for Local Storage | **Accepted** | 2026-11-22 | Utilize structured IndexedDB storage with strict schema migration and privacy erasure. |
| **[ADR-004](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/ADR-004-no-remote-llm-for-calculations.md)** | No Remote LLM for Mathematical Operations | **Accepted** | 2026-11-22 | Restrict LLMs to explanatory language assistance; forbid numerical inference. |
| **[ADR-005](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/ADR-005-progressive-data-resolution.md)** | Progressive Data Resolution Gating | **Accepted** | 2026-11-22 | Bind analytical capabilities strictly to available data; forbid synthetic hourly guessing. |
| **[ADR-006](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/ADR-006-research-and-deployment-separation.md)** | Research vs. Deployment Codebase Separation | **Accepted** | 2026-11-22 | Maintain clean Python research sandbox for experiments and TypeScript PWA for deployment. |
