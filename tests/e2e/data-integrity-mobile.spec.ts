import { test, expect } from '@playwright/test';

test.describe('HearthShift AI — Data Integrity, Mobile Layout, and Validation Resilience', () => {
  test('validates REFIT power integration, form validation errors, mobile responsive viewport, and full auditability', async ({
    page,
  }) => {
    // ══════════════════════════════════════════════════════════
    // 1. Mobile Viewport Verification (375 x 667 - iPhone SE)
    // ══════════════════════════════════════════════════════════
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('HearthShift AI');
    await expect(page.getByText('100% On-Device', { exact: true })).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/7-mobile-viewport.png' });

    // Restore standard desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // ══════════════════════════════════════════════════════════
    // 2. Form Validation Resilience: Malformed Dates and Negative Units
    // ══════════════════════════════════════════════════════════
    await page.locator('input[name="billing_period_start"]').fill('2026-06-30');
    await page.locator('input[name="billing_period_end"]').fill('2026-05-01'); // End before start!
    await page.locator('input[name="total_units_kwh"]').fill('-50'); // Negative units!

    await page.getByRole('button', { name: /Verify Calculation/i }).click();

    // Verify field validation errors are surfaced
    await expect(
      page.getByText(/End date cannot be earlier than start date/i)
    ).toBeVisible();
    await expect(
      page.getByText(/Consumption cannot be negative/i)
    ).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/8-validation-errors.png' });

    // ══════════════════════════════════════════════════════════
    // 3. REFIT Power Ingestion Verification (Watts -> Trapezoidal kWh)
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Smart Meter CSV Import/i }).click();

    const refitPowerCsv = `Time,Unix,Aggregate
2014-04-01 00:00:00,1396310400,1500
2014-04-01 00:00:08,1396310408,1500
2014-04-01 00:00:16,1396310416,1800`;

    await page.locator('input[type="file"]').setInputFiles({
      name: 'refit_house1_sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(refitPowerCsv),
    });

    // Verify preview surfaces power semantics
    await expect(page.getByText(/CSV Validation Preview/i)).toBeVisible();
    await expect(page.getByText(/trapezoidal numerical integration/i)).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/9-refit-power-preview.png' });

    // Commit readings
    await page.getByRole('button', { name: /Confirm & Save.*Readings/i }).click();

    // Verify unlocked in intervals tab
    await expect(page.getByText('INTERVAL MODE').first()).toBeVisible();
    await expect(page.getByText('Empirical Interval Load Profile')).toBeVisible();

    // ══════════════════════════════════════════════════════════
    // 4. Privacy Purge & Audit Verification
    // ══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /Privacy & Storage/i }).click();
    await page.getByRole('button', { name: 'Delete All My Data' }).click();
    await page.getByRole('button', { name: 'Yes, Delete Everything' }).click();
    await expect(page.getByText('All household data was permanently wiped from IndexedDB.')).toBeVisible();
  });
});
