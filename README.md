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
3. **Enforces Conservative, Model-Bounded Risk & Provenance Tracking:** Computes empirical Bayesian lower credible bounds ($Q_{0.05}$) under explicit model priors—without guaranteeing physical bill outcomes—and tags every savings figure by provenance (`simulated`, `user_reported`, `meter_observed`, `measurement_verified`).
4. **Enforces Progressive Capability Gating:** In basic mode (monthly bills only), the app strictly refuses to generate synthetic hourly curves or make unprovable appliance claims.

---

## 2. Foundational Architecture & Documentation

All architectural decisions, threat models, research specifications, and data contracts have been codified for formal review:

| Document | Path | Description |
| :--- | :--- | :--- |
| **Product Requirements Document (PRD)** | [`docs/prd/PRD.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/prd/PRD.md) | Personas, user journeys, 5-whys, functional & non-functional requirements. |
| **Research Specification** | [`docs/research/RESEARCH-SPEC.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/research/RESEARCH-SPEC.md) | SPARE-HEM algorithm, mathematical formulations, EVSI, baselines (B1–B5). |
| **Phase 3 Parity Report** | [`docs/research/PHASE-3-PARITY-REPORT.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/research/PHASE-3-PARITY-REPORT.md) | Cross-language Python/TypeScript parity, exact quadrature proofs, model vs. physical bounds. |
| **Stage 1 Usability Protocol** | [`docs/pilot/USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md) | Phase 4A Stage 3 pre-pilot protocol ($N = 5\text{--}10$ usability, $Q_{0.05}$, $c_{\text{ask}}$, safety check; not executed). |
| **Field-Pilot & RCT Protocol** | [`docs/pilot/FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md) | Proposed two-stage pilot & Stage 2 powered RCT ($N = 152\text{--}160$ enrolled for $d=0.50$; pending ethics approval). |
| **M&V Methodology Review** | [`docs/pilot/MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md) | EVO IPMVP Option C & ASHRAE 14 gap review (explicitly no Option C certification claimed). |
| **RCT Power Analysis** | [`research/experiments/power_analysis.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/power_analysis.py) | Exact `scipy.stats` power & sample size calculations ([`power_analysis_phase4a.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/results/power_analysis_phase4a.json)). |
| **Architecture Decision Records (ADRs)** | [`docs/adr/`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/adr/README.md) | ADR-001 through ADR-006 documenting local-first, deterministic tariffs, pure TS separation. |
| **System Threat Model** | [`docs/threat-model/THREAT-MODEL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/threat-model/THREAT-MODEL.md) | STRIDE analysis, LINDDUN privacy analysis, residual risks. |
| **TypeScript Data Contracts** | [`src/types/contracts.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/types/contracts.ts) | Canonical TypeScript domain contracts for tariffs, readings, preferences. |
| **Data Contracts Guide** | [`docs/prd/DATA-CONTRACTS.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/prd/DATA-CONTRACTS.md) | Entity relationships, capability mapping, data lifecycle. |
| **IndexedDB Schema (Dexie.js)** | [`src/lib/db.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/lib/db.ts) | Client-side database implementation with atomic erasure & JSON export. |
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
│   ├── pilot/
│   │   ├── USABILITY-STUDY-PROTOCOL.md # Stage 1 N=5-10 usability & safety protocol
│   │   ├── FIELD-PILOT-PROTOCOL.md     # Two-stage field pilot & Stage 2 powered RCT plan
│   │   └── MV-METHODOLOGY-REVIEW.md    # IPMVP Option C & ASHRAE 14 compliance gap review
│   ├── research/
│   │   ├── RESEARCH-SPEC.md           # SPARE-HEM mathematical & experimental spec
│   │   └── PHASE-3-PARITY-REPORT.md   # Python/TS parity & model vs. physical bounds
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
│   ├── workers/                       # Web Workers (e.g. csv-parser.worker.ts)
│   ├── app/                           # Next.js app router & pages
│   ├── components/                    # UI components & widgets
│   └── locales/                       # Bilingual translation bundles (en, ta)
├── research/                          # Python research sandbox (simulator, baselines, power)
│   ├── simulation/
│   ├── simulator/
│   ├── algorithms/
│   ├── baselines/
│   ├── experiments/
│   │   └── power_analysis.py          # Phase 4A exact statistical power analysis
│   ├── results/
│   │   └── power_analysis_phase4a.json
│   └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/                      # Verified tariff & CSV fixtures
├── package.json
└── tsconfig.json
```

---

## 4. Current Phase: Phase 4A Pre-Pilot & Statistical Readiness

- **Software & Mathematical Parity:** Pure client-side TypeScript application (`src/`), Python simulator/baselines (`research/`), cross-language numerical parity tests, and statistical RCT power sizing (`research/experiments/power_analysis.py`) are implemented and verified in software.
- **Human Field Studies (Not Executed):** Stage 1 pre-pilot usability & safety comprehension ($N = 5\text{--}10$, [`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md)) and Stage 2 powered RCT ($N = 152\text{--}160$ enrolled for $d=0.50$, [`FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md)) are **proposed protocols pending ethics and deployment approval**; zero human household trials have been executed.
- **M&V Scope:** HearthShift AI does **not** claim EVO IPMVP Option C or ASHRAE Guideline 14 certification ([`MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md)).
