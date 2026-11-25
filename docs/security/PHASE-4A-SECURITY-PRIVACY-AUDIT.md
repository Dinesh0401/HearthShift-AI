# Phase 4A Security & Privacy Audit
## HearthShift AI — Production Threat Model (STRIDE + LINDDUN + Browser Storage)

**Document Status:** Phase 4A Security & Privacy Engineering Audit (`v0.1.0-alpha`)  
**Date:** November 25, 2026  
**Execution Runtime:** 100% Client-Side Pure JavaScript/TypeScript + Browser IndexedDB (`HearthShiftDB`, zero WebAssembly binaries)  
**Companion Specifications:** [`THREAT-MODEL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/threat-model/THREAT-MODEL.md) · [`PRODUCTION-DEPLOYMENT-GUIDE.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/deployment/PRODUCTION-DEPLOYMENT-GUIDE.md) · [`DATABASE-SCHEMA.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/prd/DATABASE-SCHEMA.md)  

---

## 1. System Boundary & Trust Model

HearthShift AI processes sensitive domestic electricity consumption records (bi-monthly utility bills, smart-meter interval series, appliance preference beliefs, and feedback logs) exclusively inside the user's browser sandbox:

- **Zero Backend Endpoints:** Inspecting `src/app/` confirms only [`layout.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/app/layout.tsx), [`page.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/app/page.tsx), and [`globals.css`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/app/globals.css). There are **zero** Next.js API routes (`/api/*`), **zero** Server Actions, **zero** remote databases, and **zero** remote LLM endpoints (`ADR-004`).
- **Zero Behavioral Telemetry:** No analytics SDKs, error beacons, third-party fonts, or tracking pixels exist in `package.json` or built bundles.
- **Architectural Privacy vs. Cryptographic Privacy:** On-device execution eliminates remote cloud exfiltration risk, whereas TR-VOI's per-question penalty (`privacyCostPaise`) is an interactive decision-theoretic friction rather than $(\epsilon, \delta)$-differential privacy or cryptographic computation.

---

## 2. Same-Origin Request & Payload Verification

### 2.1 Static & Runtime Network Isolation

| Check | Verification Mechanism | Observed Evidence |
| :--- | :--- | :--- |
| **No `/api/` Route Handlers** | Source tree audit of `src/app/` | Zero `route.ts` files and zero server-side data endpoints. |
| **No `fetch()` During Ingestion/Policy** | [`tests/unit/ingestion-privacy.test.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/unit/ingestion-privacy.test.ts) stubs `global.fetch` | Asserts `fetchSpy` called **0 times** across `validateManualBill()`, `parseEnergyCsv()`, and `evaluateCapabilityState()`. |
| **Zero Outbound E2E Network Calls** | Playwright request listener in [`tests/e2e/ingestion-workflow.spec.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/ingestion-workflow.spec.ts#L20-L31) and [`tests/e2e/phase3-mvp-reliability.spec.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/phase3-mvp-reliability.spec.ts#L20-L30) | Captures all browser requests outside localhost (`127.0.0.1:3008` / `localhost:3008` / `data:` / `blob:`) across bill entry, CSV import, simulator, recommendations, Tamil toggle, JSON export, and full purge; asserts `externalTelemetryRequests === []`. |
| **Local Export Mechanism** | [`PrivacyDataManager.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/components/dashboard/PrivacyDataManager.tsx#L44-L64) | Uses `new Blob(...)` + `URL.createObjectURL(blob)` so JSON backup downloads locally without hitting any remote endpoint. |

---

## 3. Content Security Policy (CSP) & HTTP Security Headers

Identical strict security headers are configured across all three deployment surfaces:
1. Node.js Runtime: [`next.config.mjs`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/next.config.mjs#L7-L54) (`NEXT_STATIC_EXPORT !== 'true'`)
2. Vercel Edge Hosting: [`vercel.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/vercel.json#L1-L41)
3. Cloudflare Pages / Netlify Static Export: [`public/_headers`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/public/_headers#L1-L9) (`NEXT_STATIC_EXPORT=true`)

### 3.1 Enforced CSP Directives & Security Rationale

| Directive / Header | Configured Value | Security Role & Audit Notes |
| :--- | :--- | :--- |
| `default-src` | `'self'` | Blocks external origins by default across resource types. |
| `connect-src` | `'self'` | **Exfiltration Guard:** Blocks browser `fetch`, `XHR`, `WebSocket`, and `EventSource` connections to any third-party host. |
| `script-src` | `'self' 'unsafe-inline'` | Blocks all external script origins. `'unsafe-inline'` is retained in `v0.1.0-alpha` to allow Next.js App Router inline hydration bootstrap scripts in static export mode (`output: 'export'`). Strict nonce/hash CSP removal of `'unsafe-inline'` is queued for a future dynamic-SSR hardening phase. |
| `style-src` | `'self' 'unsafe-inline'` | Allows local Tailwind CSS and React/Recharts inline styles while blocking external stylesheets. |
| `img-src` | `'self' data: blob:` | Restricts images to origin plus local data/blob URIs. |
| `font-src` | `'self' data:` | Blocks third-party font CDNs (zero Google Fonts tracking). |
| `worker-src` | `'self' blob:` | Permits local Web Workers (e.g., [`csv-parser.worker.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/workers/csv-parser.worker.ts)) from same-origin or blob contexts. |
| `manifest-src` | `'self'` | Restricts web manifest loading to same origin. |
| `object-src` | `'none'` | Disables legacy plugins (`<object>`, `<embed>`). |
| `base-uri` | `'self'` | Prevents `<base>` tag injection hijacking relative script URLs. |
| `form-action` | `'self'` | Prevents HTML form submission hijacking to external domains. |
| `frame-ancestors` | `'none'` | Prevents clickjacking via iframe embedding (paired with `X-Frame-Options: DENY`). |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces 2-year HTTPS transport security once deployed on HTTPS. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing. |
| `Referrer-Policy` | `no-referrer` | Suppresses referrer leakage on navigation. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Disables sensitive hardware/sensor APIs at the browser permission layer. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context group from cross-origin popups. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Blocks cross-origin reads of local resources. |

---

## 4. Dependency Vulnerability Audit (`npm audit`)

Audited directly against [`package.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/package.json) and `package-lock.json` on November 25, 2026:

### 4.1 Production Runtime Dependencies (`npm audit --omit=dev`)

- **Command Executed:** `npm audit --omit=dev`
- **Observed Result:** **`found 0 vulnerabilities`**
- **Verified Production Upgrades:**
  - `next`: `^16.4.6` (0 known production advisories)
  - `zod`: `^4.6.7` (0 known production advisories)
  - `dexie`: `^4.0.8`, `react`: `^18.3.1`, `react-dom`: `^18.3.1`, `recharts`: `^2.13.3`, `lucide-react`: `^0.460.0` (0 known production advisories)

### 4.2 Full Dev-Inclusive Audit (`npm audit`)

- **Observed Result:** **10 vulnerabilities (`6 moderate`, `1 high`, `3 critical`)**, **100% isolated to `devDependencies`** (`vitest@^2.1.5` and `@vitest/coverage-v8@^2.1.9` transitive chain):
  - `tinypool <=2.1.1` (Critical: GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr — worker/run options prototype pollution)
  - `@vitest/mocker <=4.1.11` (Moderate: GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8)
  - `esbuild <=0.24.2` via `vite <=6.4.3` / `vite-node <=2.2.0-beta.2` (Moderate: GHSA-67mh-4wv8-2f99 — local dev server request exposure)
  - `glob 9.0.0–14.0.1` (Moderate: GHSA-3g3m-2fjr-6pw4) and `minimatch 7.0.0–11.0.0` (Moderate: GHSA-g3hv-75wg-m249) via `test-exclude >=7.0.0`
- **Production Impact Assessment:** None of these Vitest/Vite/esbuild/tinypool packages are imported by `src/` or shipped in `.next/` or `out/` browser bundles.
- **Developer Hygiene & Remediation:** Only execute `vitest` locally on trusted repositories (do not run Vitest watch/dev servers exposed on untrusted networks), and schedule a breaking major upgrade to `vitest@5.x` / `@vitest/coverage-v8@5.x` in a dedicated post-Phase 4A dependency PR.

---

## 5. Input Validation Boundaries (CSV & Manual Bills)

### 5.1 Smart-Meter CSV Ingestion Boundaries

Implemented in [`src/core/ingestion/csv-parser.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/ingestion/csv-parser.ts) and [`src/components/ingestion/CsvDropzone.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/components/ingestion/CsvDropzone.tsx) and verified in [`tests/unit/csv-parser.test.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/unit/csv-parser.test.ts):

| Control | Implementation Detail | Threat Mitigated |
| :--- | :--- | :--- |
| **25 MB File Size Cap** | `MAX_CSV_BYTES = 25 * 1024 * 1024`; checked pre-read on `file.size` in `CsvDropzone.tsx` and re-verified on string length + `TextEncoder().encode(csvContent).byteLength` in `parseEnergyCsv()`. | Browser tab OOM crash / memory exhaustion DoS. |
| **500,000-Row Hard Bound** | `MAX_CSV_ROWS = 500000`; enforced during linear `indexOf('\n')` scan before building full row/reading arrays. | Multi-million-row CPU/IndexedDB freeze DoS. |
| **Linear $O(N)$ CSV Parsing** | `splitCsvLine()` and `detectDelimiter()` use deterministic character-by-character state machines (zero dynamic/backtracking `RegExp`). Tested against 50 KB malformed unclosed-quote payload in `<1000 ms`. | ReDoS (Regular Expression Denial of Service). |
| **Timestamp & Numeric Sanity** | `parseDateTimeString()` rejects empty strings or strings `> 64` chars; numeric values reject `NaN`, `Infinity`, and negatives (`< 0`). | Malformed input crashes and negative-energy poisoning. |
| **Error Array Memory Cap** | `max_errors_retained` defaults to `50`, bounding retained `CsvRowError` records in memory. | Unbounded error list bloat on corrupted files. |
| **Abort Cancellation** | Supports `AbortController` / `AbortSignal` in UI and parser loop. | User recovery from slow parses. |

> [!NOTE]
> **Main-Thread Yielding vs. Web Worker Wiring:** While [`src/workers/csv-parser.worker.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/workers/csv-parser.worker.ts) implements the background Worker wrapper for `parseEnergyCsv`, [`CsvDropzone.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/components/ingestion/CsvDropzone.tsx#L4-L93) currently calls `parseEnergyCsv` directly on the UI thread with periodic `setTimeout(..., 0)` yields every 500 rows. Wiring `CsvDropzone.tsx` to spawn `csv-parser.worker.ts` is recommended before lifting the 25 MB / 500k-row bounds on low-end mobile devices.

### 5.2 Manual Bill Input Validation & Text Sanitization

Implemented in [`src/core/ingestion/manual-bill.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/ingestion/manual-bill.ts) and verified in [`tests/unit/manual-bill.test.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/unit/manual-bill.test.ts):

- **Strict Calendar Dates (`parseStrictIsoDate`):** Enforces exact `YYYY-MM-DD` pattern and UTC calendar round-trip equality (`getUTCFullYear/Month/Date`), rejecting impossible dates such as `2026-02-30` without silent JavaScript Date rollover. Rejects `startDate > endDate` and `endDate > todayUtc`.
- **Plausibility Caps:** Consumption requires finite numbers in `[0, 100000]` kWh (`MAX_PLAUSIBLE_HOUSEHOLD_KWH`); optional billed amount requires finite numbers in `[0, 2000000]` INR (`MAX_BILL_AMOUNT_INR`).
- **HTML & Control Character Sanitization (`sanitizePlainTextInput`):** Strips angle brackets (`<`, `>`) and ASCII control characters (`code < 0x20` and `0x7F`), trims whitespace, and caps `bill_reference_no` at `64` characters (`MAX_REFERENCE_LENGTH`). React JSX renders all fields via text nodes (no `dangerouslySetInnerHTML` anywhere in `src/`).
- **CSV Formula Character Boundary:** `exportAllUserData()` emits structured JSON (`application/json`), not spreadsheet-evaluated CSV. Leading spreadsheet formula characters (`=`, `+`, `-`, `@`) are not stripped from `bill_reference_no` (preserving legitimate utility IDs like `CA-04-129`); if future versions add CSV export of user text fields, cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` **must** be prefixed with `'` during CSV serialization to prevent spreadsheet formula injection.

---

## 6. STRIDE & LINDDUN Threat Matrix

### 6.1 STRIDE Threat Summary

| Category | Threat Vector | Current Mitigation in `v0.1.0-alpha` | Residual Risk / Gap |
| :--- | :--- | :--- | :--- |
| **S — Spoofing** | Tampered tariff schedule misleading household around 500 kWh cliff. | Tariff definitions statically bundled in [`tnpdcl-lt1a.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/tariffs/tnpdcl-lt1a.ts), served over HTTPS with strict CSP. | Hosting account compromise could alter static JS; mitigate with signed Git commits, protected `main`, and SRI/immutable deployments. |
| **T — Tampering** | Modification of local bills/readings or injected XSS payload. | Same-origin IndexedDB isolation; strict CSP; React JSX auto-escaping; `sanitizePlainTextInput` strips `<`/`>`/control chars. | `'unsafe-inline'` in `script-src` weakens defense-in-depth if an XSS gadget were ever introduced; physical user can edit own IndexedDB via DevTools. |
| **R — Repudiation** | Disputed deterministic bill calculation or provenance claim. | Integer-paise calculator (`calculator.ts`), `tariff_plan_id` + `tariff_version` recorded on results, explicit 4-tier `SavingsBasis` badges. | Manual user entries (`user_reported`) remain self-attested; formal M&V is not certified. |
| **I — Information Disclosure** | Exfiltration of smart-meter occupancy traces or bill details. | Zero backend endpoints, `connect-src 'self'`, 0 third-party scripts, Playwright & Vitest network audits. | Unencrypted IndexedDB/JSON backup on disk; malicious `<all_urls>` browser extensions; shoulder-surfing on unlocked/shared devices. |
| **D — Denial of Service** | Oversized or maliciously quoted CSV crashes client browser tab. | 25 MB cap, 500k-row cap, $O(N)$ parser, `AbortSignal`, 50-error cap, Recharts downsampling (`maxPlotPoints = 200`). | Main-thread yielding (`CsvDropzone.tsx`) can feel sluggish on low-RAM phones near 25 MB until `csv-parser.worker.ts` is wired directly. |
| **E — Elevation of Privilege** | Escape from browser sandbox or unauthorized hardware access. | Pure web APIs only; `Permissions-Policy` blocks camera, mic, geolocation, payment, and USB; zero native plugins or device actuation. | None inside standard browser sandbox assuming patched browser engine. |

### 6.2 LINDDUN Privacy Assessment

| Privacy Property | Phase 4A Assessment |
| :--- | :--- |
| **Linkability** | **Zero external linkability:** No device fingerprint, cookie, user ID, or network telemetry leaves the browser. |
| **Identifiability** | **Local-only:** Optional `bill_reference_no` is sanitized and retained solely in local IndexedDB (`HearthShiftDB`). |
| **Non-repudiation** | **Client-confined:** Feedback (`useful`, `impractical`, `tried_it`) and preferences remain local unless the user manually downloads and shares `hearthshift_backup_*.json`. |
| **Detectability** | **App-level silent:** App generates zero outbound network traffic during user interactions; static asset fetches happen only when loading the app shell. |
| **Disclosure of Information** | **Primary residual surface is local client storage & browser extensions** (Section 7). |
| **Unawareness** | Mitigated via persistent `PrivacyDataManager.tsx` notice on storage risks, explicit Synthetic Demo banner, Alpha disclosure banner, and Stage 1 comprehension protocol ([`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md)). |
| **Non-compliance** | User-sovereign erasure (`deleteAllUserData()`), atomic batch rollback (`rollbackBatch()`), and transparent JSON export (`exportAllUserData()`) provide direct local control. |

---

## 7. Honest Disclosure of Browser Storage & Client-Environment Limitations

As also surfaced directly to users in [`PrivacyDataManager.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/components/dashboard/PrivacyDataManager.tsx#L121-L135) and [`src/locales/i18n.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/locales/i18n.tsx#L90-L91):

1. **Unencrypted at Rest in Browser Storage & Backups:**
   - `HearthShiftDB` (IndexedDB SQLite/LevelDB files inside the OS user browser profile) and `hearthshift_lang` / `hearthshift_demo_mode` / `hearthshift_active_tariff_id` (`localStorage`) are stored **unencrypted at rest** by the browser unless the user's operating system enables full-disk encryption (e.g., Windows **BitLocker**, macOS **FileVault**, or Linux **LUKS**).
   - Files exported via **Export All Data (JSON)** (`exportAllUserData()`) are plain, human-readable JSON and must be protected by the user on their filesystem.
2. **Browser Quota Eviction & Private/Incognito Mode Clearance:**
   - Under severe host disk pressure, browsers may evict origin IndexedDB storage unless persistent storage (`navigator.storage.persist()`) is requested and granted (`db.ts` does not auto-request persistence in `v0.1.0-alpha`).
   - Opening the app in **Private / Incognito** mode permanently wipes all `HearthShiftDB` and `localStorage` records when the session closes.
3. **Malicious Browser Extensions (`<all_urls>`):**
   - Any browser extension granted broad host permissions (`<all_urls>` or active-tab script injection) runs inside the page context or can inspect DOM state, `localStorage`, and `IndexedDB`, bypassing HTTP CSP protections. Users should run HearthShift AI in a clean browser profile free of untrusted extensions.
4. **Shared / Unlocked Device Physical Access:**
   - Anyone with unlocked access to the same OS user account and browser profile can view stored bills/readings or export JSON until the user clicks **Delete All My Data** (`deleteAllUserData()`).
