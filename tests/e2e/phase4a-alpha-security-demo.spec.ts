import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isAllowedAppOrigin, assertHostedTargetSafety } from './helpers/origin';

test.describe('HearthShift AI — Phase 4A Alpha Security, Same-Origin Privacy, Demo Mode & Real-User Workflow', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.resolve('tests/e2e/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('verifies CSP & security headers, zero same-origin/external telemetry payloads, supported tariff switching, Safe Demo Mode, 10-step real-user flow, and mobile accessibility', async ({
    page,
  }) => {
    // ══════════════════════════════════════════════════════════
    // 1. Capture ALL Requests (External + Same-Origin) & CSP Events
    // ══════════════════════════════════════════════════════════
    const externalRequests: string[] = [];
    const sameOriginMutationsOrBodies: { url: string; method: string; postData: string | null }[] = [];
    const sameOriginSensitiveQueries: string[] = [];
    const cspViolations: string[] = [];
    const consoleCspErrors: string[] = [];

    const sensitiveTokens = [
      'DEMO-SYNTH',
      'CA-04-ALPHA',
      '508',
      '512',
      'smart_meter',
      'kwh',
      'hearthshift_backup',
      'tried_it',
    ];

    page.on('request', (request) => {
      const url = request.url();
      const isAppOrigin = isAllowedAppOrigin(url) && !url.startsWith('data:') && !url.startsWith('blob:');

      if (!isAllowedAppOrigin(url)) {
        externalRequests.push(`${request.method()} ${url}`);
        return;
      }

      if (isAppOrigin) {
        const method = request.method();
        const postData = request.postData();
        if (method !== 'GET' && method !== 'HEAD') {
          sameOriginMutationsOrBodies.push({ url, method, postData });
        }
        if (postData) {
          sameOriginMutationsOrBodies.push({ url, method, postData });
        }
        const queryIdx = url.indexOf('?');
        if (queryIdx !== -1) {
          const queryPart = url.slice(queryIdx).toLowerCase();
          for (const token of sensitiveTokens) {
            if (queryPart.includes(token.toLowerCase())) {
              sameOriginSensitiveQueries.push(url);
            }
          }
        }
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error' && /content security policy|csp/i.test(msg.text())) {
        consoleCspErrors.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      window.addEventListener('securitypolicyviolation', (e) => {
        (window as unknown as { __cspViolations?: string[] }).__cspViolations =
          (window as unknown as { __cspViolations?: string[] }).__cspViolations || [];
        (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
          `${e.violatedDirective}:${e.blockedURI}`
        );
      });
    });

    // ══════════════════════════════════════════════════════════
    // 2. Load App & Inspect Security Headers (CSP, XFO, XCTO, Referrer)
    // ══════════════════════════════════════════════════════════
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    const headers = response!.headers();
    assertHostedTargetSafety(page.url(), headers);
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("connect-src 'self'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');

    // Verify Alpha Limitations Disclosure is accessible
    const alphaSummary = page.getByText(/Experimental Research Alpha — Advisory Models Only/i);
    await expect(alphaSummary).toBeVisible();
    await alphaSummary.click();
    await expect(
      page.getByText(/not utility-certified billing statements, guaranteed physical savings, or IPMVP Option C verified outcomes/i)
    ).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 3. Safe Demo Mode Regression Test (Synthetic Data, Zero Fake Verified Savings)
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Load Safe Demo Dataset/i }).click();

    // Verify persistent synthetic demo banner
    await expect(
      page.getByText(/SYNTHETIC DEMO MODE — Simulated Sample Household/i)
    ).toBeVisible();

    // Verify 3 synthetic bills rendered with historically accurate schedules & boundary disclosure
    const mayJunRow = page.getByRole('row', { name: /2026-05-01 → 2026-06-30/i });
    await expect(mayJunRow).toContainText('508 kWh');
    await expect(mayJunRow).toContainText('in-tnpdcl-lt1a-may2026');
    await expect(mayJunRow).toContainText('₹2107.20');
    await expect(mayJunRow).toContainText(/Crosses May 10, 2026 policy date/i);

    const marAprRow = page.getByRole('row', { name: /2026-03-01 → 2026-04-30/i });
    await expect(marAprRow).toContainText('492 kWh');
    await expect(marAprRow).toContainText('in-tnpdcl-lt1a-2025');
    await expect(marAprRow).toContainText('₹1754.60');
    await expect(marAprRow).not.toContainText(/Crosses May 10, 2026/i);

    const janFebRow = page.getByRole('row', { name: /2026-01-01 → 2026-02-28/i });
    await expect(janFebRow).toContainText('445 kWh');
    await expect(janFebRow).toContainText('in-tnpdcl-lt1a-2025');
    await expect(janFebRow).toContainText('₹1458.50');
    await expect(janFebRow).not.toContainText(/Crosses May 10, 2026/i);

    // Modern counterfactuals remain on May 2026 schedule distinct from Jan–Apr historical receipts
    await expect(page.locator('#region-tariff-selector')).toHaveValue('in-tnpdcl-lt1a-may2026');

    // Verify capability mode reached OPTIMIZATION ELIGIBLE from 192h demo dataset
    await expect(page.getByText('OPTIMIZATION ELIGIBLE').first()).toBeVisible();

    // Verify Savings Ledger remains strictly empty (0 fake savings!)
    await page.getByRole('tab', { name: /Savings Ledger/i }).click();
    await expect(page.getByText(/Logged Efficiency Actions/i)).toBeVisible();
    await expect(page.getByText('No completed actions logged yet.', { exact: false })).toBeVisible();
    await expect(page.getByText('₹0.00').first()).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/phase4a-demo-mode.png' });

    // Exit & Clear Demo Data cleanly
    await page.getByRole('button', { name: /Exit & Clear Demo Data/i }).click();
    await expect(
      page.getByText(/SYNTHETIC DEMO MODE — Simulated Sample Household/i)
    ).toHaveCount(0);

    // ══════════════════════════════════════════════════════════
    // 4. Supported Tariff Region Switching (Gate D Steps 1-2)
    // ══════════════════════════════════════════════════════════
    await page.getByRole('tab', { name: /Bills & Slab Analysis/i }).click();
    const regionSelector = page.locator('#region-tariff-selector');

    // Switch to Generic Flat Tariff -> verifies no cliff UI shown
    await regionSelector.selectOption('generic-flat-inr');
    await expect(page.getByText(/Flat Rate Reference Tariff — No Subsidy Cliff/i)).toBeVisible();

    // Switch to Pilot TOU Tariff -> verifies TOU time bands rendered
    await regionSelector.selectOption('generic-tou-inr');
    await expect(page.getByText(/Time-of-Use \(TOU\) Tariff — No Subsidy Cliff/i)).toBeVisible();
    await expect(page.getByText('Night Off-Peak').first()).toBeVisible();

    // Switch back to TNPDCL May 2026 Scheme
    await regionSelector.selectOption('in-tnpdcl-lt1a-may2026');
    await expect(page.getByText(/TNPDCL LT-1A Domestic \(May 10, 2026/i).first()).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 5. Real-User Workflow Without Shortcuts (Steps 3-10)
    // ══════════════════════════════════════════════════════════
    // Step 3-4: Enter Manual Bill near cliff (512 kWh)
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('512');
    await page.locator('input[name="bill_reference_no"]').fill('CA-04-ALPHA-99');
    await page.getByRole('button', { name: /Save Bill Locally/i }).click();
    await expect(page.getByRole('cell', { name: '512 kWh' })).toBeVisible();

    // Step 3b: Upload 8-day hourly CSV (keyboard/file input) & verify 25MB/limit metadata visible
    await page.getByRole('tab', { name: /Smart Meter CSV Import/i }).click();
    let hourlyCsv = 'timestamp,kwh\n';
    const baseTs = new Date('2026-05-01T00:00:00Z').getTime();
    for (let h = 0; h < 192; h++) {
      hourlyCsv += `${new Date(baseTs + h * 3600000).toISOString().replace('T', ' ').slice(0, 19)},0.42\n`;
    }
    await page.locator('input[type="file"]').setInputFiles({
      name: 'alpha_user_intervals.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(hourlyCsv),
    });
    await expect(page.getByText(/CSV Validation Preview/i)).toBeVisible();
    await page.getByRole('button', { name: /Confirm & Save 192 Readings/i }).click();

    // Step 5: Scenario Simulator with ARIA switch assertions
    await page.getByRole('tab', { name: /Scenario Simulator/i }).click();
    await expect(page.getByText(/₹478\.40 TARIFF CLIFF JUMP AVOIDED!/i)).toBeVisible();
    const geyserSwitch = page.getByRole('switch', { name: /Trim water heater duration/i });
    await expect(geyserSwitch).toHaveAttribute('aria-checked', 'false');
    await geyserSwitch.click();
    await expect(geyserSwitch).toHaveAttribute('aria-checked', 'true');

    // Step 6-8: Recommendation, EVSI Dialog Modal, Uncertainty/Assumptions & Feedback
    await page.getByRole('tab', { name: /Smart Recommendations/i }).click();
    const dialog = page.getByRole('dialog');
    const dialogVisible = await dialog.waitFor({ state: 'visible', timeout: 3500 }).then(
      () => true,
      () => false
    );
    if (dialogVisible) {
      await expect(page.getByText('EVSI Decision Gate Active')).toBeVisible();
      await page.getByRole('button', { name: /Yes \/ Comfortable/i }).click();
    }
    await expect(page.getByText('Modeled Estimate', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('95% Modeled Comfort Bound')).toBeVisible();
    await expect(page.getByText('Conservative Model Lower Bound (5th %ile)')).toBeVisible();
    await page.getByRole('button', { name: /Tried It!/i }).click();

    // Step 9: Savings Ledger records unverified user_reported item cleanly
    await page.getByRole('tab', { name: /Savings Ledger/i }).click();
    await expect(page.getByText('🔵 User Reported').first()).toBeVisible();
    await expect(page.getByText(/not yet IPMVP Option C certified/i)).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 6. Mobile Viewport & Accessibility Verification (375x667)
    // ══════════════════════════════════════════════════════════
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#region-tariff-selector')).toBeVisible();
    await expect(page.getByRole('tablist')).toBeVisible();

    // Test Tamil mobile rendering & screenshot
    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.getByText('சேமிப்பு விவரப் பதிவேடு').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/phase4a-mobile-a11y.png' });

    // Switch back to English and desktop viewport
    await page.getByLabel('Toggle language between English and Tamil').click();
    await page.setViewportSize({ width: 1280, height: 800 });

    // ══════════════════════════════════════════════════════════
    // 7. Browser Storage Limitations, Export & Purge (Step 10)
    // ══════════════════════════════════════════════════════════
    await page.getByRole('tab', { name: /Privacy & Storage/i }).click();
    await expect(page.getByText('Browser Storage Limitations & Device Risks')).toBeVisible();
    await expect(page.getByText(/stored unencrypted at rest/i)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export All Data (JSON)' }).click(),
    ]);
    expect(download.suggestedFilename()).toContain('hearthshift_backup_');

    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const exportedBackup = JSON.parse(fs.readFileSync(downloadPath!, 'utf-8'));
    expect(exportedBackup.app).toBe('HearthShift AI');
    expect(exportedBackup.export_schema_version).toBe(2);
    expect(exportedBackup).not.toHaveProperty('readings_sample');
    expect(exportedBackup.bills_count).toBe(1);
    expect(exportedBackup.bills).toHaveLength(1);
    expect(exportedBackup.readings_count).toBe(192);
    expect(exportedBackup.readings).toHaveLength(192);
    for (const tableKey of [
      'meta',
      'tariffs',
      'preferences',
      'recommendations',
      'feedback',
      'savings',
      'scenarios',
      'questions',
    ]) {
      expect(Array.isArray(exportedBackup[tableKey])).toBe(true);
    }
    expect(exportedBackup.savings.length).toBeGreaterThanOrEqual(1);

    await page.getByRole('button', { name: 'Delete All My Data' }).click();
    await page.getByRole('button', { name: 'Yes, Delete Everything' }).click();
    await expect(
      page.getByText('All household data was permanently wiped from IndexedDB.')
    ).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 8. Final Privacy & Security Assertions (Zero Leaks, Zero CSP Errors)
    // ══════════════════════════════════════════════════════════
    const docCookie = await page.evaluate(() => document.cookie);
    const runtimeCsp = await page.evaluate(
      () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []
    );
    cspViolations.push(...runtimeCsp);

    expect(docCookie).toBe('');
    expect(externalRequests).toEqual([]);
    expect(sameOriginMutationsOrBodies).toEqual([]);
    expect(sameOriginSensitiveQueries).toEqual([]);
    expect(cspViolations).toEqual([]);
    expect(consoleCspErrors).toEqual([]);
  });
});

