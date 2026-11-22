# ADR-006: Separation of Scientific Research Engine and Production PWA

## Status
Accepted

## Date
2026-11-22

## Context
HearthShift AI encompasses both a scientific research hypothesis (the SPARE-HEM algorithm, EVSI formulations, Bayesian active learning, and benchmark evaluations against published datasets like Low Carbon London and REFIT) and a production-grade consumer web application (Next.js, React, Tailwind, IndexedDB, PWA).

Mixing Python scientific experiment scripts directly into the web application source code creates dependency bloat, build fragility, and architectural confusion. Conversely, forcing researchers to run scientific simulations in TypeScript limits access to scientific Python packages (NumPy, SciPy, Pandas, scikit-learn).

## Decision
We establish a clean, dual-track architectural separation:
1. **Scientific Research Engine (`research/`):**
   * Implemented in Python 3.10+.
   * Contains the synthetic household simulator (`hearthshift-sim`), public dataset loaders (LCL, REFIT, UCI), benchmark baseline implementations (B1–B5), ablation experiments, and statistical plotting scripts.
   * Exports standardized algorithm specifications and JSON parameter test vectors.
2. **Production Web Application (`src/`):**
   * Implemented in strict TypeScript with Next.js / React.
   * Implements the validated SPARE-HEM algorithms natively in TypeScript/WASM for zero-dependency client-side execution.
   * Validated against the research engine via automated cross-language conformance fixtures (`tests/fixtures/`).

## Consequences
### Positive
* Researchers leverage the full Python scientific ecosystem for rapid experimentation and publication figures.
* The frontend web application remains lean, secure, and easily bundled as a zero-dependency static PWA.
* Mathematical parity between Python and TypeScript implementations is rigorously enforced via shared JSON test fixtures.

### Negative
* Core algorithmic logic (e.g. EVSI calculation and billing arithmetic) must be implemented and maintained in both Python (for research experiments) and TypeScript (for web deployment).

## Alternatives Considered
* *Single TypeScript Codebase:* Running all research experiments in TypeScript/Node.js. Rejected due to the lack of robust scientific optimization and statistical modeling packages in the Node ecosystem.
* *Python Backend with Web Frontend:* Deploying the Python engine as a cloud backend. Rejected because it violates our non-negotiable local-first privacy requirement.
