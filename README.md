# HearthShift AI
## Privacy-First Home Energy Intelligence · Decision-Aware, Privacy-Minimal Assistant

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/Architecture-Local--First%20PWA-green.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Privacy](https://img.shields.io/badge/Privacy-Zero%20Raw%20Telemetry-brightgreen.svg)](docs/threat-model/THREAT-MODEL.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Research Core Problem:** "What is the smallest amount of information necessary to help a household make a better electricity decision, without knowing everything about their daily life—and without repeatedly disturbing them?"

---

## 1. Project Overview

HearthShift AI is an on-device residential electricity decision assistant that helps households make smarter electricity choices with minimal interaction and zero behavioral surveillance.

Unlike existing solutions (e.g. Sense, Emporia Energy, LICA 2026, or cloud-based NILM apps) that require high-frequency sensors or cloud ingestion of personal telemetry, HearthShift:
1. **Runs 100% On-Device:** All raw readings, preferences, and calculations stay in browser IndexedDB. Zero private telemetry leaves the client.
2. **Selects Questions by Value of Information ($\text{EVSI}$):** Inquires about routines only when the expected decision benefit exceeds the cognitive burden and privacy sensitivity of the question.
3. **Guarantees Conservative, Evidence-Bounded Savings:** Computes lower credible bounds ($Q_\alpha(S)$) and tracks savings basis (`simulated`, `user_reported`, `measured`).
4. **Enforces Progressive Capability Gating:** In basic mode (monthly bills only), the app strictly refuses to generate synthetic hourly curves or make unprovable appliance claims.

---

## 2. Foundational Architecture & Documentation

All architectural decisions, threat models, research specifications, and data contracts have been codified for formal review:

| Document | Path | Description |
| :--- | :--- | :--- |
| **Product Requirements Document (PRD)** | [`docs/prd/PRD.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/prd/PRD.md) | Personas, user journeys, 5-whys, functional & non-functional requirements. |
| **Research Specification** | [`docs/research/RESEARCH-SPEC.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/research/RESEARCH-SPEC.md) | SPARE-HEM algorithm, mathematical formulations, EVSI, baselines (B1–B5). |
| **Architecture Decision Records (ADRs)** | [`docs/adr/`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/README.md) | ADR-001 through ADR-006 documenting local-first, deterministic tariffs, etc. |
| **System Threat Model** | [`docs/threat-model/THREAT-MODEL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/threat-model/THREAT-MODEL.md) | STRIDE analysis, LINDDUN privacy analysis, residual risks. |
| **TypeScript Data Contracts** | [`src/types/contracts.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/types/contracts.ts) | Canonical TypeScript domain contracts for tariffs, readings, preferences. |
| **Data Contracts Guide** | [`docs/prd/DATA-CONTRACTS.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/prd/DATA-CONTRACTS.md) | Entity relationships, capability mapping, data lifecycle. |
| **IndexedDB Schema (Dexie.js)** | [`src/lib/db.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/lib/db.ts) | Client-side database implementation with atomic erasure & export. |
| **Database Schema Documentation** | [`docs/prd/DATABASE-SCHEMA.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/prd/DATABASE-SCHEMA.md) | Table structures, indices, storage budgets, migration policy. |
| **30-Day Implementation Plan** | [`docs/plan/IMPLEMENTATION-PLAN.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/plan/IMPLEMENTATION-PLAN.md) | 4-phase milestone roadmap, dependencies, and risk register. |
| **Phase 1 Acceptance Criteria** | [`docs/plan/PHASE-1-ACCEPTANCE.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/plan/PHASE-1-ACCEPTANCE.md) | 18 verifiable acceptance tests (AT-001 through AT-018) for Phase 1. |

---

## 3. Repository Structure

```
HearthShift-AI/
├── docs/
│   ├── prd/
│   │   ├── PRD.md                     # Product Requirements Document
│   │   ├── DATA-CONTRACTS.md          # Domain contract documentation & capability gating
│   │   └── DATABASE-SCHEMA.md         # IndexedDB schema specification
│   ├── research/
│   │   └── RESEARCH-SPEC.md           # SPARE-HEM mathematical & experimental spec
│   ├── adr/
│   │   ├── README.md                  # ADR index
│   │   ├── ADR-001-local-first-architecture.md
│   │   ├── ADR-002-deterministic-billing.md
│   │   ├── ADR-003-data-storage-indexeddb.md
│   │   ├── ADR-004-no-remote-llm-for-calculations.md
│   │   ├── ADR-005-progressive-data-resolution.md
│   │   └── ADR-006-research-and-deployment-separation.md
│   ├── threat-model/
│   │   └── THREAT-MODEL.md            # STRIDE/LINDDUN security & privacy assessment
│   └── plan/
│       ├── IMPLEMENTATION-PLAN.md     # 30-day 4-phase milestone schedule
│       └── PHASE-1-ACCEPTANCE.md      # Acceptance tests AT-001 through AT-018
├── src/
│   ├── types/
│   │   └── contracts.ts               # Core TypeScript domain contracts
│   ├── lib/
│   │   └── db.ts                      # Dexie.js local database implementation
│   ├── core/                          # Domain engines (tariff, billing, optimizer, EVSI)
│   ├── app/                           # Next.js app router & pages
│   ├── components/                    # UI components & widgets
│   └── locales/                       # Bilingual translation bundles (en, ta)
├── research/                          # Python research sandbox (simulator, baselines, ablations)
│   ├── simulation/
│   ├── baselines/
│   ├── experiments/
│   └── notebooks/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/                      # Verified tariff & CSV fixtures
├── package.json
└── tsconfig.json
```

---

## 4. Current Phase: Architecture Review Gate

In accordance with principal engineering standards, all foundational architecture deliverables are complete and presented for human architectural review before implementation of Phase 1 commences.
