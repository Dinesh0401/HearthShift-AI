# HearthShift AI — Phase 4B Cloudflare Pages Deployment Checklist

**Document Status:** Deployment Preparation & Operator Handoff (`v0.1.0-alpha`)  
**Preferred Static Host:** Cloudflare Pages via GitHub Integration (`out/` static export + `out/_headers`)  
**GitHub Actions CI Run Verified (`205c3cc`):** [`runs/45606235572`](https://github.com/Dinesh0401/HearthShift-AI/actions/runs/45606235572) (`completed` / `success`)  

---

## 1. Verified Pre-Deployment Configuration (Gates 1–3 Local Ready)

| Setting / Artifact | Exact Value / Repository Path | Status |
| :--- | :--- | :--- |
| **Deployment Integration** | **GitHub → Cloudflare Pages** (`Dinesh0401/HearthShift-AI`, automatic previews) | Preferred |
| **Framework Preset** | Next.js (Static HTML Export) (`output: 'export'` in [`next.config.mjs`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/next.config.mjs)) | Ready |
| **Build Command** | `npm run build:static` *(sets `NEXT_STATIC_EXPORT=true` cleanly cross-platform)* | Verified |
| **Build Output Directory** | `out` | Verified (`npm run verify:static`) |
| **Production Branch** | `main` | Verified (`origin/main` pushed) |
| **Response Headers Rule File** | [`public/_headers`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/public/_headers) → copied to `out/_headers` | Verified (8 security headers) |
| **Cloudflare Web Analytics** | **DISABLED** (must remain disabled in Cloudflare Dashboard to preserve zero telemetry & `connect-src 'self'`) | Operator Check Required |
| **Zero-Secret Env Vars** | [`/.env.example`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/.env.example): `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_DEMO_ENABLED=true` | Zero Secrets Confirmed |

> [!WARNING]
> Do **not** create a separate Wrangler Direct Upload project unless explicitly desired—use **Cloudflare Pages → Connect to Git (`Dinesh0401/HearthShift-AI`)** so every branch/PR generates a preview deployment URL automatically before updating `main`.

---

## 2. Step-by-Step GitHub → Cloudflare Pages Verification Runbook

> [!IMPORTANT]
> **Platform Authorization Required:** Account-owner authentication (`Cloudflare` + `GitHub OAuth`) is required to connect Cloudflare Pages to `Dinesh0401/HearthShift-AI`. Never store API tokens or secrets in repo files or logs.

### Step A — Connect GitHub Repository in Cloudflare Pages

1. Verify local & GitHub Actions CI parity before connecting:
   ```bash
   npm ci && npm run type-check && npm run lint && npm run test && npm run build:static && npm run verify:static && npm run test:e2e:static
   ```
2. In **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**:
   - Select repository `Dinesh0401/HearthShift-AI`
   - **Production branch:** `main`
   - **Build command:** `npm run build:static`
   - **Build output directory:** `out`
   - **Cloudflare Web Analytics:** Disabled
3. Push any release change to a preview branch first (or open a PR against `main`) to obtain a **Preview HTTPS URL** (`https://<hash>.hearthshift-ai.pages.dev`).

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

1. Merge the verified preview branch / PR into `main` (never force-push or bypass CI).
2. Confirm Cloudflare Pages automatically deploys `main` with `npm run build:static` → `out/`.
3. Repeat Step B against the live production HTTPS URL (`https://hearthshift-ai.pages.dev` or custom domain) and record the deployed Git commit, Cloudflare deployment ID, and live header/E2E audit.

---

## 3. Rollback Procedure

1. **Instant Cloudflare Pages Rollback:** Open **Cloudflare Dashboard → Workers & Pages → `hearthshift-ai` → Deployments**, select the prior verified deployment ID, and click **Rollback to this deployment** (immutable snapshot swap avoids mixed `_next/static` chunk hashes).
2. **Git Source Rollback:**
   ```bash
   git revert <BAD_COMMIT_SHA>
   npm ci && npm run build:static && npm run verify:static && npm run test:e2e:static
   git push origin main
   ```
3. **Post-Rollback Verification:** Re-run `curl -sI <PRODUCTION_URL>/` and `E2E_BASE_URL=<PRODUCTION_URL> npx playwright test`.

---

## 4. Phase 4B Gate Verification Ledger (`v0.1.0-alpha`)

| Phase 4B Gate | Status | Exact Verified Local Evidence / Blocking Requirement |
| :--- | :---: | :--- |
| **Gate 1 — Reproducible Release Verification & CI** | **PASS (Local & GitHub CI)** | Verified remotely on GitHub Actions [`runs/45606235572`](https://github.com/Dinesh0401/HearthShift-AI/actions/runs/45606235572) (`205c3cc`) and locally: `npm audit --omit=dev` (`0` vulns), `tsc --noEmit` (exit `0`), `eslint` (exit `0`), Vitest (`9/9` files, `83/83` tests), Pytest (`41/41` tests), and Playwright Next.js E2E (real exit code `0`). |
| **Gate 2 — Static Export (`out/`) Verification** | **PASS (Local & GitHub CI)** | `npm run build:static` compiled cleanly; `npm run verify:static` verified `37` static assets, `8` security headers in `out/_headers`, and `0` secrets; `npm run test:e2e:static` ran all `5/5` specs directly against `out/` with real exit code `0`. |
| **Gate 3 — Cloudflare Pages Preparation** | **READY (Awaiting Account Auth)** | GitHub → Cloudflare Pages settings (`npm run build:static`, `out`, `main`, Web Analytics disabled), preview-first verification, and rollback steps prepared. Connecting `Dinesh0401/HearthShift-AI` in Cloudflare Dashboard requires account-owner OAuth/login. |
| **Gate 4 — Hosted Security & Privacy Validation** | **PENDING (Blocked on Gate 3)** | Awaits reachable preview/production HTTPS URL from Cloudflare Pages (`curl -sI` + Chromium DevTools telemetry inspection). |
| **Gate 5 — Public Alpha Product Presentation** | **PASS (Local & Static)** | Added collapsible **How HearthShift Works** explanation, `v0.1.0-alpha` [`CHANGELOG.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/CHANGELOG.md) + Changelog modal, honest non-offline wording (explicitly disclosing no Service Worker caching yet), and zero-telemetry scrubbed feedback draft builder. |
| **Gate 6 — Post-Deployment Acceptance** | **NOT STARTED** | No public HTTPS URL exists yet. Must not recruit study participants or initiate Phase 4C until Gate 3, Gate 4, and Gate 6 pass on a live URL. |
