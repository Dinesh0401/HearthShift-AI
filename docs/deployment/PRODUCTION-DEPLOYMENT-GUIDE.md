# HearthShift AI — Production Deployment Guide (Phase 4A)

**Document Status:** Release Engineering Runbook (`v0.1.0-alpha`)  
**Date:** November 25, 2026  
**Architecture:** 100% Client-Side Next.js App Router (Pure JavaScript/TypeScript + Browser IndexedDB; Zero Backend APIs, Zero Remote Telemetry)  
**Environment Template:** [`.env.example`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/.env.example)  

> [!IMPORTANT]
> **LIVE DEPLOYMENT STATUS — CREDENTIALS NOT SUPPLIED LOCALLY**
> Live public hosting credentials, API tokens, DNS records, and platform authorizations (e.g., Vercel, Cloudflare Pages, Netlify, or production TLS server access) were **not supplied in the local environment**. Accordingly, **live public URL deployment has NOT been executed** during Phase 4A and awaits explicit operator platform authorization and credentials. Do **not** assume any live public URL exists until an authorized operator completes the steps below and records the verified deployment check.

---

## 1. Zero-Secret Configuration Model

HearthShift AI has **no backend database, no authentication service, no remote LLM endpoint, and no telemetry collector**. All billing calculations, CSV parsing, TR-VOI decision gating, and `HearthShiftDB` IndexedDB persistence execute locally inside the user's browser using pure client-side JavaScript/TypeScript.

Review [`.env.example`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/.env.example):

| Variable | Required | Default | Purpose | Secret? |
| :--- | :---: | :---: | :--- | :---: |
| `NEXT_PUBLIC_APP_ENV` | Optional | `production` | Non-secret environment label (`development`, `staging`, or `production`) for operator build tracking. | No |
| `NEXT_STATIC_EXPORT` | Optional | `false` | Consumed by [`next.config.mjs`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/next.config.mjs#L5). When `'true'`, sets `output: 'export'` to generate static assets under `out/`. | No |
| `NEXT_PUBLIC_DEMO_ENABLED` | Optional | `true` | Optional build/runtime visibility configuration flag (`true` or `false`) documenting Synthetic Demo Mode availability (`src/core/demo/synthetic-household.ts`). | No |
| `PORT` | Optional | `3000` | Node.js HTTP listen port for `npm run start` behind a TLS reverse proxy (Playwright E2E harness uses `3008`). | No |

---

## 2. Reproducible Build & Pre-Deploy Verification

Execute all verification gates from a clean dependency install matching `package-lock.json`:

```bash
# 1. Clean deterministic install
npm ci

# 2. Strict TypeScript check (`strict: true`, zero emit)
npm run type-check

# 3. ESLint static analysis across .ts and .tsx sources
npm run lint

# 4. Production dependency security audit (must report 0 vulnerabilities)
npm audit --omit=dev

# 5. Client-side unit & cross-language parity test suite (Vitest)
npm run test

# 6. Production build verification
#    6a. Standard Node.js server build (.next/)
npm run build

#    6b. Static CDN export build (out/) — verify if deploying to static CDN
NEXT_STATIC_EXPORT=true npm run build
```

### Build Mode Behavior in `next.config.mjs`

Per [`next.config.mjs`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/next.config.mjs#L23-L57):
- `reactStrictMode: true` and `poweredByHeader: false` are always active.
- When `NEXT_STATIC_EXPORT !== 'true'`, Next.js compiles a Node.js server build in `.next/` and serves all 8 HTTP security headers via `async headers()` on `/(.*)`.
- When `NEXT_STATIC_EXPORT === 'true'`, Next.js activates `output: 'export'` to emit static HTML/CSS/JS bundles into `out/` and disables `async headers()` (because static files do not execute Node middleware). Static deployments **must** therefore apply edge header configuration via [`vercel.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/vercel.json) or [`public/_headers`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/public/_headers).

---

## 3. Hosting Option 1: Managed HTTPS CDN / Static Platform

Managed HTTPS edge hosting eliminates Node.js server maintenance and guarantees zero application backend attack surface.

> [!TIP]
> **Phase 4B Preferred Hosting Target: Cloudflare Pages via GitHub Integration**
> Connect the GitHub repository directly to Cloudflare Pages using `npm run build:static` and output directory `out` (production branch `main`, Cloudflare Web Analytics disabled). Automated Git integration preserves preview deployments for every branch/PR. Review [`PHASE-4B-CLOUDFLARE-DEPLOYMENT-CHECKLIST.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/release/PHASE-4B-CLOUDFLARE-DEPLOYMENT-CHECKLIST.md).

### Option 1A: Cloudflare Pages (Recommended Primary Target — GitHub Integration + `out/` + `public/_headers`)

[`public/_headers`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/public/_headers) is copied automatically into `out/_headers` during `npm run build:static`, enforcing all 8 security headers at Cloudflare edge nodes. Do **not** create a competing Direct Upload project if Git-connected Pages CI/CD is planned.

1. **Build & Local Static Verification:**
   ```bash
   npm run build:static
   npm run verify:static
   npm run test:e2e:static
   ```
2. **Cloudflare Pages Project Settings (GitHub Integration):**
   - **Framework Preset:** Next.js (Static HTML Export)
   - **Production Branch:** `main`
   - **Build Command:** `npm run build:static`
   - **Build Output / Publish Directory:** `out`
   - **Environment Variables:** `NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_DEMO_ENABLED=true` (`build:static` already sets `NEXT_STATIC_EXPORT=true` cross-platform)
   - **Platform Analytics:** Ensure **Cloudflare Web Analytics** is **Disabled** so zero injected analytics beacons violate `connect-src 'self'` or `script-src 'self' 'unsafe-inline'`.
3. **Preview -> Production Verification (Requires Authorized Operator Login):**
   - Push changes to a preview branch / PR or `main`, inspect the Cloudflare Pages **Preview HTTPS URL** (`curl -sI <PREVIEW_URL>/` + `E2E_BASE_URL=<PREVIEW_URL> npx playwright test`), and only promote/verify Production once Preview checks pass.

### Option 1B: Vercel / Netlify Alternatives

[`vercel.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/vercel.json) configures identical security headers on `/(.*)` at the Vercel edge network; Netlify likewise consumes `out/_headers`. Keep Vercel Speed Insights / Web Analytics and Netlify Analytics disabled.
```bash
# Vercel (Node or static export)
npx vercel --prod

# Netlify (Static export)
NEXT_STATIC_EXPORT=true npm run build && npx netlify deploy --prod --dir=out
```

---

## 4. Hosting Option 2: Hardened Node.js Server Behind TLS/HTTPS Reverse Proxy

Use this option only when self-hosting on an institutional or private Linux host. Never expose `next start` directly to the public internet without a TLS-terminating reverse proxy.

### Step 1: Build & Bind Locally to Loopback Only

```bash
npm ci
NEXT_STATIC_EXPORT=false npm run build
NODE_ENV=production PORT=3000 npx next start -H 127.0.0.1 -p "${PORT:-3000}"
```

When served via Node.js (`NEXT_STATIC_EXPORT` unset or `false`), [`next.config.mjs`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/next.config.mjs#L7-L54) automatically sends these response headers on every route (`/(.*)`):
- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options`: `DENY`
- `X-Content-Type-Options`: `nosniff`
- `Referrer-Policy`: `no-referrer`
- `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy`: `same-origin`
- `Cross-Origin-Resource-Policy`: `same-origin`

> [!NOTE]
> Avoid redefining duplicate `Content-Security-Policy` or `X-Frame-Options` headers in your reverse proxy if `next.config.mjs` already emits them; duplicate CSP headers intersect restrictively or risk policy drift during updates.

### Step 2A: Nginx TLS Reverse Proxy Reference Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name <AUTHORIZED_DEPLOY_HOST>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name <AUTHORIZED_DEPLOY_HOST>;

    server_tokens off;

    ssl_certificate     /etc/letsencrypt/live/<AUTHORIZED_DEPLOY_HOST>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<AUTHORIZED_DEPLOY_HOST>/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # App has no server-side file upload endpoints; keep request body tiny
    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 2B: Caddy TLS Reverse Proxy Reference Configuration

```caddyfile
<AUTHORIZED_DEPLOY_HOST> {
    encode gzip zstd

    header {
        -Server
    }

    reverse_proxy 127.0.0.1:3000
}
```

Caddy automatically provisions and renews TLS certificates via ACME and redirects HTTP to HTTPS while preserving the security headers emitted by [`next.config.mjs`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/next.config.mjs).

---

## 5. Mandatory Post-Deploy Verification Checks

Execute all four checks against `<AUTHORIZED_DEPLOY_HOST>` immediately after deployment before sharing the URL with Stage 1 usability testers:

### 5.1 HTTP Security & CSP Header Inspection

```bash
curl -sI https://<AUTHORIZED_DEPLOY_HOST>/
```

Verify the response headers match all 8 policies:
1. `content-security-policy` contains `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `connect-src 'self'`, `object-src 'none'`, and `frame-ancestors 'none'`.
2. `strict-transport-security` equals `max-age=63072000; includeSubDomains; preload`.
3. `x-frame-options` equals `DENY`.
4. `x-content-type-options` equals `nosniff`.
5. `referrer-policy` equals `no-referrer`.
6. `permissions-policy`, `cross-origin-opener-policy: same-origin`, and `cross-origin-resource-policy: same-origin` are present.
7. `x-powered-by` header is absent.

### 5.2 Zero Outbound Telemetry Verification

1. Open `https://<AUTHORIZED_DEPLOY_HOST>/` in Chromium with **DevTools -> Network** open (preserve log enabled, cache disabled).
2. Perform a complete workflow: enter a manual bill, upload a sample smart-meter CSV, inspect the interval chart, toggle the scenario simulator, check recommendations, export JSON backup, and purge data.
3. Confirm **zero** requests go to any origin other than `https://<AUTHORIZED_DEPLOY_HOST>` (excluding `blob:` / `data:` URLs created locally for JSON download) and **zero** requests hit any `/api/` endpoint.
4. Optionally run the automated Playwright telemetry check against the deployed base URL (`tests/e2e/phase3-mvp-reliability.spec.ts` / `tests/e2e/ingestion-workflow.spec.ts`).

### 5.3 Synthetic Demo Mode Verification

1. On the **Bills & Slab Analysis** view, click **Load Safe Demo Dataset (Synthetic)**.
2. Verify the persistent amber banner renders: `SYNTHETIC DEMO MODE — Simulated Sample Household (Not Real Utility Data)`.
3. Verify 3 synthetic bi-monthly bills (`445 kWh`, `492 kWh`, `508 kWh`) appear and `192` hourly intervals (`demo_synthetic_8d`) unlock **Load Curves & Intervals** and **Smart Recommendations**.
4. Open the **Savings Ledger** tab and verify **0** fake verified savings records are pre-populated (`db.savings` stays empty).
5. Click **Exit & Clear Demo Data** and verify the banner disappears and all bills/readings/preferences reset cleanly.

### 5.4 Bilingual & Data Purge Sanity Check

1. Toggle the header language switcher (`தமிழ் (TA)` / `English (EN)`) and verify Tamil UI rendering without console errors.
2. In **Privacy & Storage**, verify **Export All Data (JSON)** downloads `hearthshift_backup_YYYY-MM-DD.json` locally and **Delete All My Data** resets `HearthShiftDB` across a hard page reload (`F5`).

---

## 6. Explicit Rollback Procedure

### 6.1 Git & Build Rollback

Use non-destructive `git revert` rather than force-pushing history:

```bash
# Identify the regression commit
git log -n 10 --oneline

# Create a clean revert commit
git revert <BAD_COMMIT_SHA>

# Re-verify full build before redeploying
npm ci && npm run type-check && npm run lint && npm run test && npm run build
```

### 6.2 Immutable Static Asset Rollout Rollback

Because Next.js emits content-hashed JS/CSS chunks (`_next/static/chunks/*`), **never overwrite static files partially in place** (which causes HTML/chunk hash mismatches for active browser tabs):
- **Vercel:** Promote/redeploy the last known-good immutable Deployment ID from Vercel Deployments (`vercel rollback` or instant alias promotion).
- **Cloudflare Pages / Netlify:** Trigger **Rollback to this deployment** on the previous immutable production snapshot, then verify CSP headers with `curl -sI`.
- **Self-Hosted Node.js:** Maintain atomic release directories (`/opt/hearthshift/releases/<git-sha>`) behind a symlink (`/opt/hearthshift/current`), repoint symlink to the previous release, and restart the systemd unit (`systemctl restart hearthshift`).

### 6.3 User IndexedDB (`HearthShiftDB`) Forward/Backward Safety

All household bills, interval readings, preferences, recommendations, feedback, and savings records live strictly inside the user's browser IndexedDB database `HearthShiftDB` ([`src/lib/db.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/lib/db.ts#L72-L100)), currently pinned at **`schema_version = 1`**:

- **Phase 4A (`v0.1.0-alpha`) Guarantee:** All Phase 4A releases share `this.version(1).stores({...})`, making code rollbacks across Phase 4A builds **100% forward- and backward-compatible** with existing user IndexedDB stores.
- **Rule for Any Future Schema Version Bump (`version(2)+`):**
  1. Never bump `this.version(...)` in an emergency or unverified patch.
  2. Dexie/IndexedDB rejects opening an already-upgraded `version(2)` database with older `version(1)` client code (`VersionError`).
  3. Therefore, if a future release ever ships `version(2)` and requires rollback, **do not revert `src/lib/db.ts` directly back to `version(1)`**—instead, roll back application logic while keeping an additive `version(2)` compatibility store map in `db.ts`, or instruct affected users to run **Export All Data (JSON)** (`exportAllUserData()`) before clearing origin site data.
