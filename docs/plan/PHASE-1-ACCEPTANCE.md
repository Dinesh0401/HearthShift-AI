# Phase 1 Acceptance Criteria & Verification Protocol
## HearthShift AI — Foundations Gate (Days 1–7)

**Document Status:** Approved Acceptance Specification  
**Phase Focus:** Deterministic Tariff Engine, Data Ingestion, Local Storage, Capability Mode Gating  
**Gate Policy:** Phase 2 research engine implementation may not commence until all 18 Acceptance Tests (AT-001 through AT-018) achieve 100% passing status.

---

## 1. Acceptance Test Specifications

### AT-001: Flat-Rate Tariff Deterministic Calculation
* **Pre-condition:** Flat tariff loaded (`rate_per_kwh = 5.00`, `fixed_monthly_charge = 50.00`, `tax_percentage = 0.05`).
* **Input:** Consumption of $300\text{ kWh}$ across a standard 30-day billing cycle.
* **Expected Result:**
  * Base Energy Charge: $300 \times 5.00 = ₹1,500.00$
  * Fixed Charge: $₹50.00$
  * Subtotal: $₹1,550.00$
  * Tax (5%): $₹77.50$
  * Total Calculated Amount: $₹1,627.50$
* **Verification:** Vitest assertion: `expect(calculateBill(input, flatTariff).total_amount).toBe(1627.50)`.

### AT-002: Tiered Slab Tariff Calculation (TANGEDCO LT-1A Domestic Schedule)
* **Pre-condition:** TANGEDCO domestic schedule loaded (Telescopic):
  * Tier 1: 0–100 units @ ₹0.00 (subsidized)
  * Tier 2: 101–200 units @ ₹2.25
  * Tier 3: 201–400 units @ ₹4.50
  * Tier 4: 401–500 units @ ₹6.00
  * Tier 5: >500 units @ ₹8.00
* **Input:** Consumption of $450\text{ kWh}$ in bi-monthly cycle.
* **Expected Result:**
  * Tier 1 (100 units): $100 \times 0.00 = ₹0.00$
  * Tier 2 (100 units): $100 \times 2.25 = ₹225.00$
  * Tier 3 (200 units): $200 \times 4.50 = ₹900.00$
  * Tier 4 (50 units): $50 \times 6.00 = ₹300.00$
  * Total Energy Cost: $₹1,425.00$
* **Verification:** Exact Rupee-for-Rupee match in automated test suite.

### AT-003: Multi-Period Time-of-Use (TOU) Calculation
* **Pre-condition:** TOU tariff with:
  * Peak (06:00–10:00, 18:00–22:00): ₹10.00/kWh
  * Normal (10:00–18:00): ₹7.00/kWh
  * Off-Peak (22:00–06:00): ₹5.00/kWh
* **Input:** Hourly series totaling $10\text{ kWh}$ Peak, $15\text{ kWh}$ Normal, $25\text{ kWh}$ Off-Peak.
* **Expected Result:**
  * $(10 \times 10.00) + (15 \times 7.00) + (25 \times 5.00) = 100 + 105 + 125 = ₹330.00$.
* **Verification:** Automated unit test asserting interval mapping and subtotal accumulation.

### AT-004: Zero Consumption & Edge Case Boundary Handling
* **Input:** $0\text{ kWh}$ consumption with flat and tiered tariffs.
* **Expected Result:**
  * Total energy cost $= ₹0.00$.
  * Fixed monthly charges and mandatory base duties applied correctly.
* **Verification:** Asserts no divide-by-zero or NaN outputs.

### AT-005: Input Validation & Negative / Invalid Rejection
* **Input:** Negative kWh ($-50$), non-numeric strings (`"abc"`), reversed billing dates (`start > end`), future dates.
* **Expected Result:** Validation engine returns explicit, human-readable error messages; no calculation attempted.

### AT-006: Manual Bill Entry Persistence
* **Action:** User enters a 2-month bill (380 units, ₹1,240, start: 2026-09-01, end: 2026-10-31).
* **Expected Result:** Record persisted into IndexedDB `bills` table; visible on dashboard history; analysis mode remains `basic`.

### AT-007: Smart-Meter CSV Ingestion (Half-Hourly Resolution)
* **Action:** Import a 30-day Low Carbon London CSV containing 1,440 half-hourly rows.
* **Expected Result:**
  * Web Worker parses all 1,440 rows in $<500\text{ ms}$.
  * Records saved into IndexedDB `readings` table.
  * System transitions `AnalysisMode` to `detailed`.

### AT-008: CSV Importer Malformed Data Resilience
* **Action:** Import CSV containing empty rows, missing headers, unparseable timestamps, and negative values.
* **Expected Result:**
  * Parser reports line-by-line validation errors.
  * User is prompted to import only valid rows or cancel.
  * Browser UI remains responsive with zero main-thread freezing.

### AT-009: Analysis Mode Capability Gating
* **Test Case A (Basic Mode):** With only monthly bills present, assert that the UI disables hourly load-shifting controls and hides hourly graphs.
* **Test Case B (Detailed Mode):** With interval CSV imported, assert that load-shifting and TOU optimization features become active.

### AT-010: Persistent Local Storage Across Browser Restart
* **Action:** Populate bills and readings; simulate tab reload / browser restart.
* **Expected Result:** IndexedDB retains 100% of stored records; dashboard recovers complete state without data loss.

### AT-011: Complete User Data Erasure (Right to be Forgotten)
* **Action:** Click "Delete All My Data" in Privacy Settings; confirm dialog.
* **Expected Result:**
  * All 8 private tables (`bills`, `readings`, `preferences`, `recommendations`, `feedback`, `savings`, `scenarios`, `questions`) cleared.
  * Public tariff definitions remain intact.
  * Verification check asserts `await db.bills.count() === 0` and `await db.readings.count() === 0`.

### AT-012: Transparent User Data Export
* **Action:** Click "Export All Data".
* **Expected Result:** Triggers browser download of a valid JSON file containing all stored records formatted for auditability.

### AT-013: Zero Outbound Network Telemetry Verification
* **Action:** Execute complete end-to-end user journey (bill entry, CSV import, tariff calculation, data export) under automated Playwright test with network interception enabled.
* **Expected Result:** Exactly zero network requests made to any host other than the local server serving static assets. `requests.filter(r => !r.url().includes('localhost')).length === 0`.

### AT-014: Localization Framework Parity (English & Tamil)
* **Action:** Toggle language switcher between `en` and `ta`.
* **Expected Result:**
  * Navigation links, forms, slab descriptors, and error alerts re-render in Tamil.
  * Currency values formatted correctly (`₹1,500.00`).
  * Zero missing translation fallback warnings in browser console.

### AT-015: Responsive Mobile Viewport Usability
* **Action:** Render application at 360px mobile width (simulating standard Android device).
* **Expected Result:** Zero horizontal layout breaking; all touch targets $\ge 48\text{px}$; forms fully legible and operable.

### AT-016: Tariff Versioning & Prorating Support
* **Action:** Bill span transitions across two tariff revisions (e.g. effective date July 1).
* **Expected Result:** Billing engine calculates proportional charges for days under Version A and days under Version B.

### AT-017: Deterministic Arithmetic Invariance
* **Action:** Execute 1,000 sequential runs of the billing calculator with identical inputs.
* **Expected Result:** 1,000 identical float outputs with zero jitter beyond IEEE 754 precision.

### AT-018: Continuous Integration Automated Gate
* **Action:** Run `npm run test`, `npm run lint`, and `npm run type-check`.
* **Expected Result:** All test suites pass with zero failures, zero linter warnings, and zero TypeScript compiler errors.

---

## 2. Definition of Done (DoD) Checklist for Phase 1

- [ ] All 18 Acceptance Tests verified and automated in Vitest / Playwright.
- [ ] Unit test code coverage for billing engine $\ge 90\%$.
- [ ] Strict TypeScript mode enabled (`strict: true`) with zero `any` type escapes in core calculations.
- [ ] Static analysis passes with zero ESLint warnings.
- [ ] Verified regulatory test fixture files created for:
  - `tests/fixtures/tariffs/tamil-nadu-residential-2024.json`
  - `tests/fixtures/tariffs/flat-rate-example.json`
  - `tests/fixtures/tariffs/tou-example.json`
- [ ] Sample CSV test files committed:
  - `tests/fixtures/csv/london-halfhourly-sample.csv`
  - `tests/fixtures/csv/malformed-sample.csv`
- [ ] Architectural review signed off by principal reviewer.