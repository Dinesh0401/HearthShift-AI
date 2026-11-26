import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isAllowedAppOrigin } from './helpers/origin';

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
    const externalTelemetryRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!isAllowedAppOrigin(url)) {
        externalTelemetryRequests.push(url);
      }
    });

    await page.goto('/');

    // 1. Verify Brand, On-Device Privacy & Initial Home Overview Empty State
    await expect(page.locator('h1')).toContainText('HearthShift AI');
    await expect(page.getByText('100% On-Device · IndexedDB')).toBeVisible();
    await expect(page.getByText('Bills only').first()).toBeVisible();
    await expect(page.getByText('No electricity bill added yet')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/1-dashboard-initial.png' });

    // 2. Navigate to Bills tab and verify deterministic cliff headroom details
    await page.getByRole('tab', { name: /^Bills$/i }).click();
    await expect(page.getByRole('heading', { name: /TNPDCL LT-1A Domestic/i })).toBeVisible();
    await page.locator('#panel-bills').getByRole('button', { name: /Calculation details/i }).click();
    await expect(page.getByText('+₹478.40').first()).toBeVisible();

    // 3. Manual Bill Entry Workflow (480 kWh)
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('480');
    await page.getByRole('button', { name: /^Save bill$/i }).click();

    await expect(page.getByText('Bill saved locally in IndexedDB.')).toBeVisible();
    await expect(page.getByText('2026-05-01 → 2026-06-30').first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '480 kWh' })).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/2-bill-entered.png' });

    // 4. Reload Persistence & Home Overview Verification
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Home overview' })).toBeVisible();
    await expect(page.getByText('480', { exact: true }).first()).toBeVisible();

    // 5. Verify Scientific Gating on Usage Curve in Bills-only mode
    await page.getByRole('tab', { name: /^Usage$/i }).click();
    await expect(page.getByText(/Usage curve requires interval readings/i)).toBeVisible();
    await expect(page.getByText(/never fabricates synthetic hourly curves/i)).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/3-interval-gated.png' });

    // 6. Smart-Meter CSV Ingestion Workflow
    await page.getByRole('tab', { name: /Import CSV/i }).click();
    const sampleCsv = `timestamp,kwh
2026-05-01 00:00:00,0.45
2026-05-01 01:00:00,0.38
2026-05-01 02:00:00,0.32
2026-05-01 03:00:00,0.30`;

    await page.locator('input[type="file"]').setInputFiles({
      name: 'smart_meter_sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(sampleCsv),
    });

    await expect(page.getByText(/CSV Validation Preview/i)).toBeVisible();
    await expect(page.getByText('Resolution: hourly')).toBeVisible();
    await page.getByRole('button', { name: /Confirm & Save.*Readings/i }).click();

    // 7. Verify Meter readings active mode & Unlocked Chart
    await expect(page.getByText('Meter readings active').first()).toBeVisible();
    await expect(page.getByText('Hourly usage curve')).toBeVisible();
    await expect(page.getByText('Readings stored:')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/4-interval-unlocked.png' });

    // 8. Bilingual Tamil Verification
    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.getByText('ஹார்த்ஷிஃப்ட் AI').first()).toBeVisible();
    await expect(page.getByText('மீட்டர் அளவீடுகள் செயலில்').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/5-tamil-language.png' });

    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.locator('h1')).toContainText('HearthShift AI');

    // 9. Data Sovereign Purge
    await page.getByRole('tab', { name: /Privacy & data/i }).click();
    await expect(page.getByText(/0 external telemetry requests made/i)).toBeVisible();

    await page.getByRole('button', { name: 'Delete all data' }).click();
    await expect(page.getByText('Delete every local record permanently? This cannot be undone.')).toBeVisible();
    await page.getByRole('button', { name: 'Yes, delete everything' }).click();
    await expect(page.getByText('All household data was permanently wiped from IndexedDB.')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Bills only').first()).toBeVisible();
    await expect(page.getByText('No electricity bill added yet')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/6-purged-empty-state.png' });

    // 10. Hard Privacy Invariant
    expect(externalTelemetryRequests).toEqual([]);
  });
});
