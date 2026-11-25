# HearthShift AI — Phase 4B Cloudflare Pages Deployment Checklist

**Document Status:** Deployment Preparation & Operator Handoff (`v0.1.0-alpha`)  
**Preferred Static Host:** Cloudflare Pages (`out/` static Next.js export + `out/_headers`)  
**Starting Software Baseline:** `78521ce` / `005191cd34c53dd88e47302d852febe2287df9d8`  

---

## 1. Verified Pre-Deployment Configuration (Gates 1–3 Local Ready)

| Setting / Artifact | Exact Value / Repository Path | Status |
| :--- | :--- | :--- |
| **Framework / Export Mode** | Next.js Static Export (`NEXT_STATIC_EXPORT=true` in [`next.config.mjs`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/next.config.mjs)) | Ready |
| **Build Command** | `NEXT_STATIC_EXPORT=true npm run build` | Verified |
| **Build Output Directory** | `out` | Verified (`npm run verify:static`) |
| **Response Headers Rule File** | [`public/_headers`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/public/_headers) → copied to `out/_headers` | Verified (8 security headers) |
| **Web Analytics / Edge Scripts** | **DISABLED** (must remain disabled in Cloudflare Dashboard to satisfy `connect-src 'self'` & zero telemetry) | Operator Check Required |
| **Zero-Secret Env Vars** | [`/.env.example`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/.env.example): `NEXT_STATIC_EXPORT=true`, `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_DEMO_ENABLED=true` | Zero Secrets Confirmed |

---

## 2. Step-by-Step Preview -> Production Deployment Runbook

> [!IMPORTANT]
> **Platform Authorization Required:** Never commit Cloudflare API tokens or account IDs into this repo or logs. Run Wrangler interactively (`npx wrangler login`) or configure Git-based Cloudflare Pages integration inside your authenticated Cloudflare Dashboard.

### Step A — Deploy Preview Branch First

```bash
# 1. Clean install & pre-deploy static bundle verification
npm ci
NEXT_STATIC_EXPORT=true npm run build
npm run verify:static
npm run test:e2e:static

# 2. Authenticate interactively (opens browser OAuth; stores zero repo secrets)
npx wrangler login

# 3. Deploy to an isolated Preview URL first
npx wrangler pages deploy out --project-name hearthshift-ai --branch preview
```

### Step B — Mandatory Hosted Security & Functional Smoke Verification (`Gate 4` & `Gate 6`)

Replace `<PREVIEW_HTTPS_URL>` with the exact `https://*.hearthshift-ai.pages.dev` URL printed by Cloudflare Pages:

```bash
# 1. Inspect hosted HTTP headers directly from edge CDN
curl -sI <PREVIEW_HTTPS_URL>/

# Assert all 8 headers match out/_headers:
# - Content-Security-Policy (default-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none')
# - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Referrer-Policy: no-referrer
# - Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
# - Cross-Origin-Opener-Policy: same-origin
# - Cross-Origin-Resource-Policy: same-origin

# 2. Run the full Playwright E2E + privacy + CSP verification suite against the live HTTPS URL
E2E_BASE_URL=<PREVIEW_HTTPS_URL> npx playwright test
```

Check manually in Chromium DevTools (`Network` + `Application -> IndexedDB` + `Console`) against `<PREVIEW_HTTPS_URL>/`:
- `0` external network requests during demo load, CSV import, simulator, recommendations, and feedback draft preview.
- `/manifest.json` and `/icon.svg` load `200 OK` without CSP errors.
- `Load Safe Demo Dataset (Synthetic)` keeps **Savings Ledger** empty (`0` verified records).
- `Export All Data (JSON)` and `Delete All My Data` clear `HearthShiftDB` across reload.

### Step C — Promote to Production Only After Preview Passes All Checks

```bash
npx wrangler pages deploy out --project-name hearthshift-ai --branch main
```

Then repeat Step B against the production HTTPS URL (`https://hearthshift-ai.pages.dev` or custom domain) and record the verified URL + Cloudflare deployment ID in the Phase 4B sign-off note.

---

## 3. Rollback Procedure

1. **Instant Cloudflare Pages Rollback:** Open **Cloudflare Dashboard → Workers & Pages → `hearthshift-ai` → Deployments**, select the prior verified deployment ID, and click **Rollback to this deployment** (immutable snapshot swap avoids mixed `_next/static` chunk hashes).
2. **Git Source Rollback:**
   ```bash
   git revert <BAD_COMMIT_SHA>
   npm ci && NEXT_STATIC_EXPORT=true npm run build && npm run verify:static && npm run test:e2e:static
   npx wrangler pages deploy out --project-name hearthshift-ai --branch main
   ```
3. **Post-Rollback Verification:** Re-run `curl -sI <PRODUCTION_URL>/` and `E2E_BASE_URL=<PRODUCTION_URL> npx playwright test`.

---

## 4. Phase 4B Gate Verification Ledger (`v0.1.0-alpha`)

| Phase 4B Gate | Status | Exact Verified Local Evidence / Blocking Requirement |
| :--- | :---: | :--- |
| **Gate 1 — Reproducible Release Verification & CI** | **PASS (Local)** | Verified on final source (`5033071` baseline): `npm audit --omit=dev` (`0` vulns), `tsc --noEmit` (exit `0`), `eslint` (exit `0`), Vitest (`9/9` files, `83/83` tests), Pytest (`41/41` tests), and Playwright Next.js E2E (`5/5` passed in `19.5s`, **real exit code `0`** via `global-setup.ts` / `global-teardown.ts`). GitHub Actions CI added at [`.github/workflows/ci.yml`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/.github/workflows/ci.yml). |
| **Gate 2 — Static Export (`out/`) Verification** | **PASS (Local)** | `npm run build:static` compiled cleanly; `npm run verify:static` verified `37` static files, `8` security headers in `out/_headers`, and `0` secrets; `npm run test:e2e:static` ran all `5/5` Playwright specs against `out/` via `scripts/serve-static-out.mjs` (`17.3s`, **real exit code `0`**). |
| **Gate 3 — Cloudflare Pages Preparation** | **READY (Awaiting Auth)** | Build settings (`NEXT_STATIC_EXPORT=true npm run build` / `out/`), `_headers`, rollback procedure, and Wrangler preview → production steps prepared. Live deployment blocked pending operator Cloudflare login/credentials. |
| **Gate 4 — Hosted Security & Privacy Validation** | **PENDING (Blocked on Gate 3)** | Awaits reachable preview/production HTTPS URL from Cloudflare Pages (`curl -sI` + Chromium DevTools telemetry inspection). |
| **Gate 5 — Public Alpha Product Presentation** | **PASS (Local & Static)** | Added collapsible **How HearthShift Works** explanation, `v0.1.0-alpha` [`CHANGELOG.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/CHANGELOG.md) + Changelog modal, honest non-offline wording (explicitly disclosing no Service Worker caching yet), and zero-telemetry scrubbed feedback draft builder. |
| **Gate 6 — Post-Deployment Acceptance** | **NOT STARTED** | No public HTTPS URL exists yet. Must not recruit study participants or initiate Phase 4C until Gate 3, Gate 4, and Gate 6 pass on a live URL. |
