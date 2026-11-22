# Local Database Schema Documentation
## HearthShift AI — IndexedDB Schema via Dexie.js

**Document Status:** Approved Storage Architecture  
**Database Name:** `HearthShiftDB`  
**Current Schema Version:** 1  
**Target Platform:** Modern Web Browsers (Chromium, WebKit, Gecko)  

---

## 1. Table Definitions & Indices

### 1.1 `bills` Table
Stores manual electricity utility bill entries entered by the user.
* **Primary Key:** `id` (Auto-incrementing integer, `++id`)
* **Indexed Fields:**
  * `billing_period_start` — Enables chronological range queries.
  * `billing_period_end` — Enables billing cycle overlap checks.
  * `created_at` — Audit timestamp.
* **Fields:**
  * `id` (`number`, optional on create)
  * `billing_period_start` (`string`, ISO 8601 date)
  * `billing_period_end` (`string`, ISO 8601 date)
  * `total_units_kwh` (`number`, total energy consumed)
  * `total_amount` (`number`, billed currency amount)
  * `currency` (`string`, ISO 4217 code)
  * `tariff_id` (`string`, reference to tariff used)
  * `bill_reference_no` (`string`, optional consumer ID / CA number)
  * `created_at` (`string`, ISO 8601)
  * `updated_at` (`string`, ISO 8601)

### 1.2 `readings` Table
Stores interval time-series readings imported from smart-meter CSV files.
* **Primary Key:** `id` (Auto-incrementing integer, `++id`)
* **Indexed Fields:**
  * `timestamp` — Temporal ordering for interval simulation.
  * `resolution` — Facilitates mode capability checks (`half-hourly`, `hourly`, etc.).
  * `source` — `csv_import`, `manual_entry`, etc.
  * `import_batch_id` — Allows roll-back or batch deletion of a specific CSV file.
* **Fields:**
  * `id` (`number`, optional on create)
  * `timestamp` (`string`, ISO 8601 UTC)
  * `value_kwh` (`number`, energy consumed in interval)
  * `resolution` (`DataResolution`)
  * `source` (`DataSource`)
  * `power_watts` (`number`, optional active power)
  * `import_batch_id` (`string`, UUID of the import session)
  * `created_at` (`string`, ISO 8601)

### 1.3 `tariffs` Table
Stores versioned regional electricity rate schedules.
* **Primary Key:** `id` (`string`, e.g., `'in-tangedco-lt1a-2024'`)
* **Indexed Fields:**
  * `region` — Geographical filtering.
  * `country_code` — Regional isolation.
  * `effective_date` — Prorating and version selection.
  * `is_active` — Marks the current household tariff.
* **Payload:** Complete `TariffDefinition` structure (flat, tiered, TOU, or tiered TOU).

### 1.4 `preferences` Table
Maintains the household's latent preference parameters and comfort constraints.
* **Primary Key:** `id` (`string`, e.g., `'default_household'`)
* **Indexed Fields:** `updated_at`
* **Fields:**
  * `comfort_constraints` (`ComfortConstraint[]`)
  * `preference_weights` (`PreferenceWeights`: cost sensitivity, comfort sensitivity, environmental concern, uncertainty variance, feedback count)

### 1.5 `recommendations` Table
Maintains generated recommendations, decision outcomes, and user status.
* **Primary Key:** `id` (`string`, UUID)
* **Indexed Fields:**
  * `created_at` — Recency sorting.
  * `type` — Category (`load_shift`, `tier_avoidance`, etc.).
  * `decision_outcome` — `recommend`, `ask_question`, or `abstain`.
  * `status` — `pending`, `accepted`, `dismissed`, `expired`.

### 1.6 `feedback` Table
Captures user interaction with recommendations.
* **Primary Key:** `id` (`string`, UUID)
* **Indexed Fields:**
  * `recommendation_id` — Foreign key link.
  * `timestamp` — Chronological sequencing for Bayesian posterior filtering.
  * `response` — `'useful'`, `'impractical'`, or `'tried_it'`.

### 1.7 `savings` Table
Evidence ledger tracking projected vs realized monetary impact.
* **Primary Key:** `id` (`string`, UUID)
* **Indexed Fields:**
  * `recommendation_id` — Link to recommendation.
  * `period_start` — Temporal grouping.
  * `basis` — `simulated`, `user_reported`, `measured`.
  * `verified` — Verification flag.

### 1.8 `scenarios` Table
Stores user-saved what-if counterfactual explorations.
* **Primary Key:** `id` (`string`, UUID)
* **Indexed Fields:** `created_at`, `updated_at`, `is_favorite`

### 1.9 `questions` Table
Caches active candidate queries evaluated under EVSI.
* **Primary Key:** `id` (`string`, UUID)
* **Indexed Fields:** `category`, `net_value`

### 1.10 `meta` Table
Maintains schema version and migration state.
* **Primary Key:** `id` (`++id`)
* **Fields:** `schema_version`, `created_at`, `last_migration`, `app_version`

---

## 2. Storage Budget & Retention Estimates

* **Manual Bill Mode:** 12 bi-monthly bills per 2 years $\approx 15 \text{ KB}$ total. Negligible footprint.
* **Smart Meter CSV Mode (30-minute intervals):**
  * $48 \text{ readings/day} \times 365 \text{ days} = 17,520 \text{ records/year}$.
  * At $\approx 80 \text{ bytes/record}$ in IndexedDB, 1 full year occupies $\approx 1.4 \text{ MB}$.
  * 3 full years of 30-minute data occupy $< 5 \text{ MB}$, well within standard browser quotas (which typically allow $> 500 \text{ MB}$).

---

## 3. Privacy Operations

1. **Deterministic Data Erasure (`deleteAllUserData`):**
   * Atomically clears all 8 private user tables (`bills`, `readings`, `preferences`, `recommendations`, `feedback`, `savings`, `scenarios`, `questions`).
   * Retains official public `tariffs` definitions so the user can continue using the calculator immediately.
2. **Transparent Data Export (`exportAllUserData`):**
   * Serializes all user tables into a standalone JSON file that the user can download and audit. Zero obfuscation or proprietary lock-in.