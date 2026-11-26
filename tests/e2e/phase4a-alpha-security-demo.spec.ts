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

  test('verifies CSP & security headers, zero same-origin/external telemetry payloads, supported tariff switching, clean Home Overview & Demo Mode, 10-step real-user flow, and mobile accessibility', async ({
    page,
  }) => {
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

    // 1. Load App & Inspect Security Headers
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

    // Expandable Research Alpha Scope Disclosure
    const alphaToggle = page.getByRole('button', { name: /Research alpha scope & model limits/i });
    await expect(alphaToggle).toBeVisible();
    await alphaToggle.click();
    await expect(page.getByText(/provides advisory modeled estimates—not utility-certified bills/i)).toBeVisible();

    // 2. Load Sample Dataset & Verify Scannable Home Overview
    await page.getByRole('button', { name: /Try sample data/i }).first().click();

    await expect(page.getByText('Sample household data active')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Home overview' })).toBeVisible();
    await expect(page.getByText('May – June 2026')).toBeVisible();
    await expect(page.getByText('508', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('₹2,107').first()).toBeVisible();
    await expect(page.getByText('8 kWh over 500 kWh threshold').first()).toBeVisible();
    await expect(page.getByText('Ready for recommendations').first()).toBeVisible();
    await expect(page.getByText('Suggested action').first()).toBeVisible();

    // If comfort check triggers before displaying action savings, answer it cleanly on Overview
    const answerOnOverviewBtn = page.getByRole('button', { name: /View recommendation/i });
    if (await answerOnOverviewBtn.isVisible().catch(() => false)) {
      await answerOnOverviewBtn.click();
      await page.getByRole('button', { name: /Yes, comfortable/i }).click();
    }
    await expect(page.getByText('Estimated savings').first()).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/phase4a-demo-mode.png' });

    // Check historical schedules & May 10 policy boundary inside Bills tab
    await page.getByRole('tab', { name: /^Bills$/i }).click();
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

    await expect(page.locator('#region-tariff-selector')).toHaveValue('in-tnpdcl-lt1a-may2026');

    // Verify Savings Ledger stays strictly empty in sample mode
    await page.getByRole('tab', { name: /Savings ledger/i }).click();
    await expect(page.getByText('No actions logged yet.')).toBeVisible();
    await expect(page.getByText('₹0.00').first()).toBeVisible();

    // Exit & Clear Sample Data
    await page.getByRole('button', { name: /Exit sample data/i }).click();
    await expect(page.getByText('Sample household data active')).toHaveCount(0);

    // 3. Supported Tariff Switching
    await page.getByRole('tab', { name: /^Bills$/i }).click();
    const regionSelector = page.locator('#region-tariff-selector');

    await regionSelector.selectOption('generic-flat-inr');
    await expect(page.getByText(/Flat rate reference tariff/i)).toBeVisible();

    await regionSelector.selectOption('generic-tou-inr');
    await expect(page.getByText(/Time-of-Use \(TOU\) tariff/i).first()).toBeVisible();
    await expect(page.getByText('Night Off-Peak').first()).toBeVisible();

    await regionSelector.selectOption('in-tnpdcl-lt1a-may2026');
    await expect(page.getByText(/TNPDCL LT-1A Domestic/i).first()).toBeVisible();

    // 4. Real-User End-to-End Flow
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('512');
    await page.locator('input[name="bill_reference_no"]').fill('CA-04-ALPHA-99');
    await page.getByRole('button', { name: /^Save bill$/i }).click();
    await expect(page.getByRole('cell', { name: '512 kWh' })).toBeVisible();

    await page.getByRole('tab', { name: /Import CSV/i }).click();
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

    await page.getByRole('tab', { name: /^Simulator$/i }).click();
    await expect(page.getByText(/Threshold cliff avoided — subsidy protected/i)).toBeVisible();
    const geyserSwitch = page.getByRole('switch', { name: /Trim water heater duration/i });
    await expect(geyserSwitch).toHaveAttribute('aria-checked', 'false');
    await geyserSwitch.click();
    await expect(geyserSwitch).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('tab', { name: /Smart recommendations/i }).click();
    const dialog = page.getByRole('dialog');
    const dialogVisible = await dialog.waitFor({ state: 'visible', timeout: 3500 }).then(
      () => true,
      () => false
    );
    if (dialogVisible) {
      await expect(page.getByText(/Quick comfort check/i)).toBeVisible();
      await page.getByRole('button', { name: /Yes, comfortable/i }).click();
    }
    await expect(page.getByText('Model-based estimate', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('95% comfort bound').first()).toBeVisible();
    await page.locator('#panel-recommendations').getByRole('button', { name: /View details/i }).click();
    await expect(page.getByText('Conservative estimate')).toBeVisible();
    await page.getByRole('button', { name: /Mark as tried/i }).click();

    await page.getByRole('tab', { name: /Savings ledger/i }).click();
    await expect(page.getByText('User Reported').first()).toBeVisible();
    await page.locator('#panel-savings').getByRole('button', { name: /View details/i }).click();
    await expect(page.getByText(/not verified causal savings/i)).toBeVisible();

    // 5. Mobile Viewport & Tamil Accessibility Check (375x667)
    await page.getByRole('tab', { name: /^Overview$/i }).click();
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#region-tariff-selector')).toBeVisible();
    await expect(page.getByRole('tablist')).toBeVisible();

    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.getByText('வீட்டு மின்சார சுருக்கம்').first()).toBeVisible();
    await expect(page.getByText('512', { exact: true }).first()).toBeVisible();
    const mobileTaOverflow = await page.evaluate(() => {
      const w = window.innerWidth;
      const offenders = [...document.querySelectorAll('*')]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.right > w + 1;
        })
        .slice(0, 8)
        .map((el) => ({
          tag: el.tagName,
          id: el.id,
          cls: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
          right: Math.round(el.getBoundingClientRect().right),
          scrollW: el.scrollWidth,
          txt: (el.textContent || '').trim().slice(0, 40),
        }));
      return { docScrollW: document.documentElement.scrollWidth, w, offenders };
    });
    expect(mobileTaOverflow.offenders).toEqual([]);
    expect(mobileTaOverflow.docScrollW).toBeLessThanOrEqual(mobileTaOverflow.w);
    await page.screenshot({ path: 'tests/e2e/screenshots/phase4a-mobile-a11y.png' });

    await page.getByLabel('Toggle language between English and Tamil').click();
    await page.setViewportSize({ width: 1280, height: 800 });

    // 6. Complete JSON Export (192 readings, all 10 tables) & Purge
    await page.getByRole('tab', { name: /Privacy & data/i }).click();
    await expect(page.getByText('Browser storage limits & security notes')).toBeVisible();
    await expect(page.getByText(/unencrypted at rest/i)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export all data (JSON)' }).click(),
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

    await page.getByRole('button', { name: 'Delete all data' }).click();
    await page.getByRole('button', { name: 'Yes, delete everything' }).click();
    await expect(page.getByText('All household data was permanently wiped from IndexedDB.')).toBeVisible();

    // 7. Zero Telemetry / Zero CSP Errors
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
