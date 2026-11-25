import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('HearthShift AI — Phase 3.1 Production MVP Reliability & Parity Gates', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.resolve('tests/e2e/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('validates 7-tab navigation, cliff simulation, adaptive recommendations, 4-tier savings provenance, Tamil i18n, privacy purge, and 100% zero external telemetry', async ({
    page,
  }) => {
    // ══════════════════════════════════════════════════════════
    // 1. Strict Privacy & External Telemetry Monitor
    // ══════════════════════════════════════════════════════════
    const externalTelemetryRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
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
    // 2. Initial Page Load & Tab Existence Verification
    // ══════════════════════════════════════════════════════════
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('HearthShift AI');
    await expect(page.getByText('100% On-Device · Zero External Telemetry · IndexedDB')).toBeVisible();

    // Verify all 7 navigation tabs exist
    const billsTab = page.getByRole('button', { name: /Bills & Slab Analysis/i });
    const importTab = page.getByRole('button', { name: /Smart Meter CSV Import/i });
    const intervalsTab = page.getByRole('button', { name: /Load Curves & Intervals/i });
    const simulatorTab = page.getByRole('button', { name: /Scenario Simulator/i });
    const recsTab = page.getByRole('button', { name: /Smart Recommendations/i });
    const savingsTab = page.getByRole('button', { name: /Savings Ledger/i });
    const privacyTab = page.getByRole('button', { name: /Privacy & Storage/i });

    await expect(billsTab).toBeVisible();
    await expect(importTab).toBeVisible();
    await expect(intervalsTab).toBeVisible();
    await expect(simulatorTab).toBeVisible();
    await expect(recsTab).toBeVisible();
    await expect(savingsTab).toBeVisible();
    await expect(privacyTab).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 3. Bill Ingestion & 500 kWh Cliff Boundary Setup
    // ══════════════════════════════════════════════════════════
    // Record a 505 kWh bill to test cliff avoidance right above the 500 kWh boundary
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('505');
    await page.getByRole('button', { name: /Save Bill Locally/i }).click();

    await expect(page.getByText('Electricity bill successfully saved locally in IndexedDB.')).toBeVisible();
    await expect(page.getByRole('cell', { name: '505 kWh' })).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 4. Scenario Simulator & Cliff Avoidance Banner
    // ══════════════════════════════════════════════════════════
    await simulatorTab.click();

    // Verify baseline shows 505.0 kWh
    await expect(page.getByText('505.0')).toBeVisible();

    // Baseline 505 kWh with default actions (-15 kWh AC, -6 kWh Standby = 484 kWh) crosses below 500 kWh cliff!
    // Verify the Cliff Avoidance Alert is rendered
    await expect(
      page.getByText(/₹478\.40 SUBSIDY CLIFF JUMP AVOIDED!/i)
    ).toBeVisible();

    // Interact with simulator controls:
    // Change AC setpoint to +1.0°C
    await page.getByRole('button', { name: '+1°C' }).click();
    // Toggle water heater trim
    await page.getByText(/Trim immersion\/geyser runtime/i).click();

    // Verify Laundry Shift honesty disclaimer
    await expect(
      page.getByText(/Under flat\/tiered tariff, shifting timing yields ₹0 direct savings/i)
    ).toBeVisible();

    // Take Audit Screenshot 1: Simulator Cliff Avoidance
    await page.screenshot({ path: 'tests/e2e/screenshots/simulator-cliff.png' });

    // ══════════════════════════════════════════════════════════
    // 5. Ingestion of 7-Day Empirical Interval Data (168 Hours)
    // ══════════════════════════════════════════════════════════
    await importTab.click();

    // Build 168 hours (7 days) of hourly smart-meter readings
    let hourlyCsv = 'timestamp,kwh\n';
    const startDate = new Date('2026-05-01T00:00:00Z');
    for (let h = 0; h < 168; h++) {
      const dt = new Date(startDate.getTime() + h * 3600 * 1000);
      const iso = dt.toISOString().replace('T', ' ').replace('.000Z', '');
      hourlyCsv += `${iso},0.35\n`;
    }

    await page.locator('input[type="file"]').setInputFiles({
      name: 'smart_meter_7days.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(hourlyCsv),
    });

    await expect(page.getByText(/CSV Validation Preview/i)).toBeVisible();
    await expect(page.getByText('Resolution: hourly')).toBeVisible();

    // Commit readings to IndexedDB
    await page.getByRole('button', { name: /Confirm & Save 168 Readings/i }).click();

    // Verify unlocked in intervals tab
    await expect(page.getByText('INTERVAL MODE').first()).toBeVisible();
    await expect(page.getByText('Empirical Interval Load Profile')).toBeVisible();
    await expect(page.getByText('Validated interval readings stored:')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 6. TR-VOI Adaptive Question & Certified Recommendation Card
    // ══════════════════════════════════════════════════════════
    await recsTab.click();

    // Check if an adaptive preference question modal is triggered
    const modalTitle = page.getByText(/Single-Question Preference Check/i);
    const isModalVisible = await modalTitle.isVisible().catch(() => false);

    if (isModalVisible) {
      await expect(page.getByText('EVSI Decision Gate Active')).toBeVisible();
      // Click 'Yes / Comfortable' to submit feedback and close modal
      await page.getByRole('button', { name: /Yes \/ Comfortable/i }).click();
    }

    // Recommendation card is displayed
    await expect(page.getByText(/95% Conservative Lower Bound/i)).toBeVisible();
    await expect(page.getByText('Simulated').first()).toBeVisible();
    await expect(page.getByText(/Regulatory Savings Rationale/i)).toBeVisible();
    await expect(page.getByText(/Explicit Model Assumptions/i)).toBeVisible();
    await expect(page.getByText(/Advisory Guidance: Manual household control only/i)).toBeVisible();

    // Take Audit Screenshot 2: Recommendation Card
    await page.screenshot({ path: 'tests/e2e/screenshots/recommendation-card.png' });

    // Click "Tried It!" button to log adopted action to savings ledger
    await page.getByRole('button', { name: /Tried It!/i }).click();
    await expect(page.getByText(/Action logged to your Savings Evidence Ledger/i)).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 7. Savings Evidence Ledger & 4 Provenance Badges
    // ══════════════════════════════════════════════════════════
    // Seed extra verified records into IndexedDB so all 4 provenance tiers are audited
    await page.evaluate(async () => {
      // @ts-expect-error - IndexedDB direct transaction
      const request = window.indexedDB.open('HearthShiftDB');
      await new Promise((resolve) => {
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['savings'], 'readwrite');
          const store = tx.objectStore('savings');

          // Measurement Verified record (IPMVP-compliant counterfactual)
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
            notes: 'Counterfactual Normalized AC Setpoint +1°C (IPMVP Option C)',
          });

          // Meter Observed record (raw interval meter delta)
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

          // Pure Simulated record
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

    // Verify 3 Top Summary Metrics
    await expect(page.getByText('Tracked Household Savings Impact')).toBeVisible();
    await expect(page.getByText('Cumulative Verified Savings')).toBeVisible();
    await expect(page.getByText('Completed Efficiency Actions')).toBeVisible();

    // Verify IPMVP Counterfactual Disclaimer Banner
    await expect(page.getByText('Rigorous 4-State Savings Provenance & Counterfactual Controls')).toBeVisible();
    await expect(
      page.getByText(/requires strict counterfactual controls \(weather normalization and occupancy verification\)/i)
    ).toBeVisible();

    // Verify provenance badges in the table
    await expect(page.getByText('🟢 Measurement Verified').first()).toBeVisible();
    await expect(page.getByText('🔵 User Reported').first()).toBeVisible();
    await expect(page.getByText('🟣 Meter Observed').first()).toBeVisible();
    await expect(page.getByText('🟡 Simulated').first()).toBeVisible();

    // Take Audit Screenshot 3: Savings Ledger
    await page.screenshot({ path: 'tests/e2e/screenshots/savings-ledger.png' });

    // ══════════════════════════════════════════════════════════
    // 8. Bilingual Tamil (தமிழ்) Verification
    // ══════════════════════════════════════════════════════════
    await page.getByLabel('Toggle language between English and Tamil').click();

    // Assert Tamil app header and ledger titles
    await expect(page.getByText('ஹார்த்ஷிஃப்ட் AI').first()).toBeVisible();
    await expect(page.getByText('சேமிப்பு விவரப் பதிவேடு').first()).toBeVisible();
    await expect(page.getByText('உறுதிசெய்யப்பட்ட திரள் சேமிப்பு').first()).toBeVisible();

    // Take Audit Screenshot 4: Tamil Interface
    await page.screenshot({ path: 'tests/e2e/screenshots/tamil-interface.png' });

    // Toggle back to English
    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.locator('h1')).toContainText('HearthShift AI');

    // ══════════════════════════════════════════════════════════
    // 9. Data Sovereign Purge & Unencrypted Backup Export
    // ══════════════════════════════════════════════════════════
    await privacyTab.click();

    await expect(page.getByText('Verified: 0 external telemetry requests made.')).toBeVisible();

    // Test Export All Data (JSON)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export All Data (JSON)' }).click(),
    ]);
    expect(download.suggestedFilename()).toContain('hearthshift_backup_');

    // Test Permanent Data Purge
    await page.getByRole('button', { name: 'Delete All My Data' }).click();
    await expect(page.getByText('Are you sure you want to delete all local energy data?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes, Delete Everything' }).click();

    await expect(
      page.getByText('All household data was permanently wiped from IndexedDB.')
    ).toBeVisible();

    // Reload page and verify empty state
    await page.reload();
    await billsTab.click();
    await expect(page.getByText('No electricity bills recorded yet.')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 10. Hard Security & Privacy Invariant: Zero External Telemetry
    // ══════════════════════════════════════════════════════════
    expect(externalTelemetryRequests).toEqual([]);
  });
});
