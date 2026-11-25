import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('HearthShift AI — Full Ingestion & Privacy Verification Workflow', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.resolve('tests/e2e/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('executes manual bill entry, validates deterministic tariff breakdown, gates interval chart, tests persistence across reload, and confirms zero external telemetry', async ({
    page,
  }) => {
    // ══════════════════════════════════════════════════════════
    // 1. Telemetry & Privacy Audit: Intercept all outgoing network requests
    // ══════════════════════════════════════════════════════════
    const externalTelemetryRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      // Allow internal Next.js assets on localhost
      if (
        !url.startsWith('http://localhost:3008') &&
        !url.startsWith('http://127.0.0.1:3008') &&
        !url.startsWith('data:') &&
        !url.startsWith('blob:')
      ) {
        externalTelemetryRequests.push(url);
      }
    });

    // ══════════════════════════════════════════════════════════
    // 2. Load Dashboard Page
    // ══════════════════════════════════════════════════════════
    await page.goto('/');

    // Verify Brand, Offline status, and Privacy badge
    await expect(page.locator('h1')).toContainText('HearthShift AI');
    await expect(page.getByText('Local Execution Safe')).toBeVisible();
    await expect(page.getByText('100% On-Device · Zero External Telemetry · IndexedDB')).toBeVisible();

    // Verify Capability Badge starts in BASIC MODE (zero interval data)
    await expect(page.getByText('BASIC MODE').first()).toBeVisible();
    await expect(
      page.getByText(/Monthly utility bills only\. Slab tracking active\./i).first()
    ).toBeVisible();

    // Verify Deterministic Tariff Headroom Card & ₹478.40 Cliff Warning
    await expect(page.getByText('TNPDCL LT-1A (2026 Scheme)').first()).toBeVisible();
    await expect(page.getByText('Cliff Cost Delta').first()).toBeVisible();
    await expect(page.getByText('+₹478.40').first()).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/1-dashboard-initial.png' });

    // ══════════════════════════════════════════════════════════
    // 3. Manual Bill Entry Workflow
    // ══════════════════════════════════════════════════════════
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('480');

    // Submit the bill form
    await page.getByRole('button', { name: /Save Bill Locally/i }).click();

    // Assert success message
    await expect(
      page.getByText('Electricity bill successfully saved locally in IndexedDB.')
    ).toBeVisible();

    // Assert bill appears in the Bill History Table with accurate calculations
    await expect(page.getByText('2026-05-01 → 2026-06-30').first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '480 kWh' })).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/2-bill-entered.png' });

    // ══════════════════════════════════════════════════════════
    // 4. Persistence Test Across Page Reload
    // ══════════════════════════════════════════════════════════
    await page.reload();
    await expect(page.getByText('2026-05-01 → 2026-06-30').first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '480 kWh' })).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 5. Verify Scientific Gating on Interval Load Curve (Basic Mode)
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Load Curves & Intervals/i }).click();

    // Verify interval chart is explicitly gated with scientific justification banner
    await expect(
      page.getByText(/Interval Time-Series Chart Gated/i)
    ).toBeVisible();
    await expect(
      page.getByText(/Aggregated monthly\/bi-monthly utility bills contain zero physical information/i)
    ).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/3-interval-gated.png' });

    // ══════════════════════════════════════════════════════════
    // 6. Smart-Meter CSV Ingestion Workflow
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Smart Meter CSV Import/i }).click();

    // Upload sample interval CSV (hourly readings)
    const sampleCsv = `timestamp,kwh
2026-05-01 00:00:00,0.45
2026-05-01 01:00:00,0.38
2026-05-01 02:00:00,0.32
2026-05-01 03:00:00,0.30`;

    // Set file directly on input[type="file"]
    await page.locator('input[type="file"]').setInputFiles({
      name: 'smart_meter_sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(sampleCsv),
    });

    // Verify validation preview displays physical metadata
    await expect(page.getByText(/CSV Validation Preview/i)).toBeVisible();
    await expect(page.getByText('Resolution: hourly')).toBeVisible();

    // Commit readings to IndexedDB (triggers onImportComplete which automatically switches to Intervals tab)
    await page.getByRole('button', { name: /Confirm & Save.*Readings/i }).click();

    // ══════════════════════════════════════════════════════════
    // 7. Verify Capability Transition to INTERVAL Mode & Unlocked Chart
    // ══════════════════════════════════════════════════════════
    await expect(page.getByText('INTERVAL MODE').first()).toBeVisible();
    await expect(page.getByText('Empirical Interval Load Profile')).toBeVisible();
    await expect(page.getByText('Validated interval readings stored:')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/4-interval-unlocked.png' });

    // ══════════════════════════════════════════════════════════
    // 8. Bilingual Tamil (தமிழ்) Verification
    // ══════════════════════════════════════════════════════════
    await page.getByLabel('Toggle language between English and Tamil').click();

    // Assert Tamil UI strings rendered
    await expect(page.getByText('ஹார்த்ஷிஃப்ட் AI').first()).toBeVisible();
    await expect(page.getByText('கால இடைவெளி முறைமை').first()).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/5-tamil-language.png' });

    // Switch back to English
    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.locator('h1')).toContainText('HearthShift AI');

    // ══════════════════════════════════════════════════════════
    // 9. Data Sovereign Purge ("Delete All My Data")
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Privacy & Storage/i }).click();

    // Verify network telemetry audit banner
    await expect(
      page.getByText('Verified: 0 external telemetry requests made.')
    ).toBeVisible();

    // Click "Delete All My Data"
    await page.getByRole('button', { name: 'Delete All My Data' }).click();
    await expect(
      page.getByText('Are you sure you want to delete all local energy data?')
    ).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: 'Yes, Delete Everything' }).click();
    await expect(
      page.getByText('All household data was permanently wiped from IndexedDB.')
    ).toBeVisible();

    // Reload page and verify system returns to clean initial state with zero bills
    await page.reload();
    await page.getByRole('button', { name: /Bills & Slab Analysis/i }).click();
    await expect(page.getByText('BASIC MODE').first()).toBeVisible();
    await expect(page.getByText('No electricity bills recorded yet.')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/6-purged-empty-state.png' });

    // ══════════════════════════════════════════════════════════
    // 10. FINAL HARD PRIVACY ASSERTION: Zero external telemetry
    // ══════════════════════════════════════════════════════════
    expect(externalTelemetryRequests).toEqual([]);
  });
});
