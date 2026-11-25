# Changelog

All notable engineering, research, security, and release milestones for HearthShift AI are documented in this file.

## `[v0.1.0-alpha]` — 2026-11-25 (Phase 4A & Phase 4B Release Candidate)

### Added
- **Deterministic Integer-Paise Tariff Engine (`src/core/tariff/`)**:
  - Tamil Nadu `TNPDCL LT-1A` (May 10, 2026 `G.O. (Ms) No. 50` / `TNERC Order No. 6 of 2025` consumer-payable slabs, 2025–2026 order, and 2024–2025 historical baseline) plus illustrative India Flat (`₹5.00/kWh`) and Pilot Time-of-Use (`₹10` peak / `₹7` day / `₹5` off-peak) references.
  - Exact slab headroom & subsidy cliff detection (`₹478.40` jump at `500` vs `501` kWh).
- **TR-VOI Decision-Aware Engine (`src/core/optimization/tr-voi.ts` & `research/algorithms/tr_voi.py`)**:
  - Multi-tariff closed-form piecewise truncated normal moments (`O(S)` exact calculation for piecewise schedules; 7-point Gauss-Hermite fallback for custom schedules), chance-constrained comfort guard ($P(D > D_{\max}) \le 0.05$), EVSI question gating, and conservative 5th-percentile lower bound ($Q_{0.05}$).
  - Verified Python ↔ TypeScript numerical parity suite (`tests/fixtures/cross_language_parity_fixtures.json`).
- **Progressive Capability Gating & Local Ingestion (`src/core/ingestion/`, `src/core/capabilities/`)**:
  - `BASIC`, `INTERVAL`, and `OPTIMIZATION_ELIGIBLE` modes preventing synthetic hourly load curves from monthly bills alone.
  - Bounds-hardened CSV importer (`25 MB` max, `500,000` rows, $O(N)$ state machine, REFIT Watts→kWh trapezoidal integration) and strict manual bill sanitization.
- **Public Alpha Safety & Presentation (`src/components/`, `src/app/`)**:
  - **Safe Synthetic Demo Mode** (`3` bills, `192h` hourly intervals, persistent warning banner, strictly empty `db.savings`).
  - **4-Tier Savings Provenance Ledger** distinguishing `Simulated`, `User Reported`, `Meter Observed`, and `Measurement Verified (Formal M&V Req.)`.
  - **Privacy & Storage Sovereign Controls** (`Export All Data (JSON)`, batch rollback, atomic `Delete All My Data`, explicit browser IndexedDB limitations disclosure).
  - **Zero-Telemetry Alpha Feedback & Changelog** allowing sanitized local feedback drafts without touching household IndexedDB records.
  - **Bilingual English / Tamil (`en` / `ta`)** interface and accessible WAI-ARIA `tablist`/`switch`/`dialog` controls.
- **Static Export & Cloudflare Pages Packaging**:
  - Conditional `NEXT_STATIC_EXPORT=true` static output (`out/`), `public/_headers` security headers (`CSP`, `XFO`, `XCTO`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`, `COOP`, `CORP`), `public/manifest.json`, and GitHub Actions verification CI (`.github/workflows/ci.yml`).

### Explicitly Not Implemented Yet in `v0.1.0-alpha`
- **Offline Service Worker Page Caching:** `public/manifest.json` provides web app metadata only; initial load and page reloads require network connectivity (open browser sessions execute computations locally without remote APIs).
- **Formal EVO IPMVP Option C / ASHRAE Guideline 14 M&V Certification:** Client does not run weather-normalized whole-facility regression baselines or uncertainty solvers.
- **Non-Tamil Nadu Regulatory Tariff Guarantees:** Non-TN schedules in the selector are illustrative reference plans only.
- **Human Field Validation:** Zero Stage 1 usability comprehension participants ($N = 5\text{--}10$) and zero Stage 2 RCT participants ($N = 152\text{--}160$) have been enrolled or tested yet.
