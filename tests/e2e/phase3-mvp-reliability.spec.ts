import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isAllowedAppOrigin } from './helpers/origin';

test.describe('HearthShift AI — Phase 3.1 Production MVP Reliability & Parity Gates', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.resolve('tests/e2e/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('validates 8-tab SaaS navigation, cliff simulation, adaptive recommendations, 4-tier savings provenance, Tamil i18n, privacy purge, and zero telemetry', async ({
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

    await expect(page.locator('h1')).toContainText('HearthShift AI');
    await expect(page.getByText('100% On-Device · IndexedDB')).toBeVisible();

    // Verify all 8 navigation tabs exist cleanly (WAI-ARIA role="tab")
    const overviewTab = page.getByRole('tab', { name: /^Overview$/i });
    const billsTab = page.getByRole('tab', { name: /^Bills$/i });
    const importTab = page.getByRole('tab', { name: /Import CSV/i });
    const intervalsTab = page.getByRole('tab', { name: /^Usage$/i });
    const simulatorTab = page.getByRole('tab', { name: /^Simulator$/i });
    const recsTab = page.getByRole('tab', { name: /Smart recommendations/i });
    const savingsTab = page.getByRole('tab', { name: /Savings ledger/i });
    const privacyTab = page.getByRole('tab', { name: /Privacy & data/i });

    await expect(overviewTab).toBeVisible();
    await expect(billsTab).toBeVisible();
    await expect(importTab).toBeVisible();
    await expect(intervalsTab).toBeVisible();
    await expect(simulatorTab).toBeVisible();
    await expect(recsTab).toBeVisible();
    await expect(savingsTab).toBeVisible();
    await expect(privacyTab).toBeVisible();

    // Record 505 kWh bill
    await billsTab.click();
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('505');
    await page.getByRole('button', { name: /^Save bill$/i }).click();
    await expect(page.getByText('Bill saved locally in IndexedDB.')).toBeVisible();
    await expect(page.getByRole('cell', { name: '505 kWh' })).toBeVisible();

    // Scenario Simulator & Cliff Avoidance
    await simulatorTab.click();
    await expect(page.getByText('505.0')).toBeVisible();
    await expect(page.getByText(/Threshold cliff avoided — subsidy protected/i)).toBeVisible();

    await page.getByRole('button', { name: '+1°C' }).click();
    await page.getByRole('switch', { name: /Trim water heater duration/i }).click();
    await expect(
      page.getByText(/Under flat or slab tariffs, shifting time of use yields ₹0 direct savings/i)
    ).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/simulator-cliff.png' });

    // Ingest 192 hourly intervals (8 days)
    await importTab.click();
    let hourlyCsv = 'timestamp,kwh\n';
    const startDate = new Date('2026-05-01T00:00:00Z');
    for (let h = 0; h < 192; h++) {
      const dt = new Date(startDate.getTime() + h * 3600 * 1000);
      const iso = dt.toISOString().replace('T', ' ').replace('.000Z', '');
      hourlyCsv += `${iso},0.35\n`;
    }

    await page.locator('input[type="file"]').setInputFiles({
      name: 'smart_meter_8days.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(hourlyCsv),
    });

    await expect(page.getByText(/CSV Validation Preview/i)).toBeVisible();
    await page.getByRole('button', { name: /Confirm & Save 192 Readings/i }).click();

    // Real user with >= 168 readings and NO comfort constraints MUST remain in Meter readings active mode
    await expect(page.getByText('Meter readings active').first()).toBeVisible();
    await expect(page.getByText('Ready for recommendations')).toHaveCount(0);
    await expect(page.getByText('Hourly usage curve')).toBeVisible();

    // Overview must prompt for genuine comfort preferences instead of inventing defaults
    await overviewTab.click();
    await expect(page.getByText('Confirm comfort preferences to unlock suggestions')).toBeVisible();
    await page.getByRole('button', { name: /Set comfort preferences/i }).click();

    // User explicitly confirms real household comfort limits on Smart recommendations tab
    await expect(page.getByText('Confirm your comfort preferences')).toBeVisible();
    const confirmComfortBtn = page.getByRole('button', { name: 'Confirm comfort preferences' });
    await expect(confirmComfortBtn).toBeDisabled();
    await page.getByLabel(/Modest AC temperature adjustment/i).check();
    await page.getByLabel(/Trim water heater timer duration/i).check();
    await expect(confirmComfortBtn).toBeEnabled();
    await confirmComfortBtn.click();

    await expect(page.getByText('User-confirmed comfort limits')).toBeVisible();
    await expect(page.getByText('Ready for recommendations').first()).toBeVisible();

    const modalButton = page.getByRole('button', { name: /Yes, comfortable/i });
    try {
      await modalButton.waitFor({ state: 'visible', timeout: 3500 });
      await expect(page.getByText(/Quick comfort check/i)).toBeVisible();
      await modalButton.click();
    } catch {
      // Recommendation ready directly
    }

    await expect(page.getByRole('heading', { name: 'Smart recommendations' })).toBeVisible();
    await expect(page.getByText('Model-based estimate', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('95% comfort bound', { exact: true }).first()).toBeVisible();

    // Expand details panel and verify Conservative estimate, Why this helps, and Assumptions
    await page.locator('#panel-recommendations').getByRole('button', { name: /View details/i }).click();
    await expect(page.getByText('Conservative estimate')).toBeVisible();
    await expect(page.getByText('Why this helps')).toBeVisible();
    await expect(page.getByText(/How this is modeled/i)).toBeVisible();
    await expect(page.getByText(/Advisory only/i).first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/recommendation-card.png' });

    await page.getByRole('button', { name: /Mark as tried/i }).click();
    await expect(
      page.getByText(/Action logged as unverified user-reported entry in Savings ledger/i)
    ).toBeVisible();

    // Seed all 4 provenance tiers into IndexedDB
    await page.evaluate(async () => {
      const request = window.indexedDB.open('HearthShiftDB');
      await new Promise((resolve) => {
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['savings'], 'readwrite');
          const store = tx.objectStore('savings');

          store.put({
            id: 'sav_verified_mv',
            recommendation_id: 'rec_mv_01',
            action_id: 'ac_setpoint_plus1_0',
            period_start: '2026-05-01',
            period_end: '2026-06-30',
            estimated_savings: 420.0,
            verified_actual_savings: 395.5,
            basis: 'measurement_verified',
            verified: true,
            notes: 'Counterfactual Normalized AC Setpoint +1°C (Pre-Pilot M&V Candidate)',
          });

          store.put({
            id: 'sav_meter_obs',
            recommendation_id: 'rec_meter_02',
            action_id: 'standby_power_down',
            period_start: '2026-05-15',
            period_end: '2026-06-15',
            estimated_savings: 85.0,
            verified_actual_savings: 82.0,
            basis: 'meter_observed',
            verified: false,
            notes: 'Raw Interval Delta: Power Strip Shutdown',
          });

          store.put({
            id: 'sav_sim_03',
            recommendation_id: 'rec_sim_03',
            action_id: 'geyser_trim',
            period_start: '2026-06-01',
            period_end: '2026-06-30',
            estimated_savings: 150.0,
            verified_actual_savings: null,
            basis: 'simulated',
            verified: false,
            notes: 'Simulated Water Heater Trim',
          });

          tx.oncomplete = () => resolve(true);
        };
      });
    });

    await savingsTab.click();
    await expect(page.getByText('Tracked modeled & reported')).toBeVisible();
    await expect(page.getByText('Formally verified savings')).toBeVisible();
    await expect(page.getByText('Logged actions', { exact: true })).toBeVisible();

    await expect(page.getByText('About verification tiers (Not IPMVP Option C certified)')).toBeVisible();
    await page.locator('#panel-savings').getByRole('button', { name: /View details/i }).click();
    await expect(page.getByText(/not verified causal savings/i)).toBeVisible();

    await expect(page.getByText('Measurement Verified').first()).toBeVisible();
    await expect(page.getByText('User Reported').first()).toBeVisible();
    await expect(page.getByText('Meter Observed').first()).toBeVisible();
    await expect(page.getByText('Simulated').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/savings-ledger.png' });

    // Tamil Verification
    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.getByText('ஹார்த்ஷிஃப்ட் AI').first()).toBeVisible();
    await expect(page.getByText('சேமிப்புப் பதிவேடு').first()).toBeVisible();
    await expect(page.getByText('அதிகாரப்பூர்வ M&V சேமிப்பு').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/tamil-interface.png' });

    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.locator('h1')).toContainText('HearthShift AI');

    // Privacy Export & Wipe
    await privacyTab.click();
    await expect(page.getByText(/0 external telemetry requests made/i)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export all data (JSON)' }).click(),
    ]);
    expect(download.suggestedFilename()).toContain('hearthshift_backup_');

    await page.getByRole('button', { name: 'Delete all data' }).click();
    await expect(page.getByText('Delete every local record permanently? This cannot be undone.')).toBeVisible();
    await page.getByRole('button', { name: 'Yes, delete everything' }).click();
    await expect(page.getByText('All household data was permanently wiped from IndexedDB.')).toBeVisible();

    await page.reload();
    await expect(page.getByText('No electricity bill added yet')).toBeVisible();

    expect(externalTelemetryRequests).toEqual([]);
  });
});
