import { test, expect } from '@playwright/test';

test.describe('HearthShift AI — Full Ingestion & Privacy Verification Workflow', () => {
  test('executes manual bill entry, validates deterministic tariff breakdown, gates interval chart, and confirms zero external telemetry', async ({
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
        !url.startsWith('http://localhost:3000') &&
        !url.startsWith('http://127.0.0.1:3000') &&
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
    await expect(page.getByText('100% On-Device')).toBeVisible();

    // Verify Capability Badge starts in BASIC MODE (zero interval data)
    await expect(page.getByText('BASIC MODE')).toBeVisible();
    await expect(
      page.getByText('Monthly utility bills only. Slab tracking active. Hourly load-shifting is strictly disabled.')
    ).toBeVisible();

    // Verify Deterministic Tariff Headroom Card & ₹478.40 Cliff Warning
    await expect(page.getByText('TNPDCL LT-1A (2026 Scheme)')).toBeVisible();
    await expect(page.getByText('Cliff Cost Delta')).toBeVisible();
    await expect(page.getByText('+₹478.40')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 3. Manual Bill Entry Workflow
    // ══════════════════════════════════════════════════════════
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('480');

    // Submit the bill form
    await page.getByRole('button', { name: 'Save Bill Locally' }).click();

    // Assert success message
    await expect(
      page.getByText('Electricity bill successfully saved locally in IndexedDB.')
    ).toBeVisible();

    // Assert bill appears in the Bill History Table with accurate calculations
    await expect(page.getByText('2026-05-01 → 2026-06-30')).toBeVisible();
    await expect(page.getByText('480 kWh')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 4. Verify Scientific Gating on Interval Load Curve (Basic Mode)
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Load Curves & Intervals/i }).click();

    // Verify interval chart is explicitly gated with scientific justification banner
    await expect(
      page.getByText('Interval Time-Series Chart Gated (Basic Mode)')
    ).toBeVisible();
    await expect(
      page.getByText('Aggregated monthly/bi-monthly utility bills contain zero physical information about intra-day timing')
    ).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 5. Smart-Meter CSV Ingestion Workflow
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Smart Meter CSV Import/i }).click();

    // Upload sample interval CSV (hourly readings)
    const sampleCsv = `timestamp,kwh
2026-05-01 00:00:00,0.45
2026-05-01 01:00:00,0.38
2026-05-01 02:00:00,0.32
2026-05-01 03:00:00,0.30`;

    // Set file on the hidden file input
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Choose CSV file/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'smart_meter_sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(sampleCsv),
    });

    // Verify validation preview displays physical metadata
    await expect(page.getByText('Validation Preview: smart_meter_sample.csv')).toBeVisible();
    await expect(page.getByText('4 valid readings')).toBeVisible();
    await expect(page.getByText('Resolution: hourly')).toBeVisible();

    // Commit readings to IndexedDB
    await page.getByRole('button', { name: 'Commit to Local Database' }).click();

    // Verify commit success
    await expect(
      page.getByText(/Successfully committed 4 readings to local IndexedDB/)
    ).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 6. Verify Capability Transition to INTERVAL Mode
    // ══════════════════════════════════════════════════════════
    await expect(page.getByText('INTERVAL MODE')).toBeVisible();

    // Switch to Intervals tab to verify chart is now unlocked
    await page.getByRole('button', { name: /Load Curves & Intervals/i }).click();
    await expect(page.getByText('Empirical Interval Load Profile')).toBeVisible();
    await expect(page.getByText('Validated interval readings stored:')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 7. Bilingual Tamil (தமிழ்) Verification
    // ══════════════════════════════════════════════════════════
    await page.getByLabel('Toggle language between English and Tamil').click();

    // Assert Tamil UI strings rendered
    await expect(page.getByText('ஹார்த்ஷிஃப்ட் AI')).toBeVisible();
    await expect(page.getByText('கால இடைவெளி முறைமை')).toBeVisible();

    // Switch back to English
    await page.getByLabel('Toggle language between English and Tamil').click();
    await expect(page.getByText('HearthShift AI')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 8. Data Sovereign Purge ("Delete All My Data")
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

    // Verify system returns to BASIC MODE with zero bills
    await page.getByRole('button', { name: /Bills & Slab Analysis/i }).click();
    await expect(page.getByText('BASIC MODE')).toBeVisible();
    await expect(page.getByText('No electricity bills recorded yet.')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 9. FINAL HARD PRIVACY ASSERTION: Zero external telemetry
    // ══════════════════════════════════════════════════════════
    expect(externalTelemetryRequests).toEqual([]);
  });
});
