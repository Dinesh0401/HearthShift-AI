import { test, expect } from '@playwright/test';

test.describe('HearthShift AI — Data Integrity, Responsive Layout, and Validation Resilience', () => {
  test('validates REFIT power integration, form validation errors, desktop/tablet/mobile responsive viewports, and full auditability', async ({
    page,
  }) => {
    // 1. Mobile (375x667) & Tablet (768x1024) Viewport Verification
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('HearthShift AI');
    await expect(page.getByText('On-Device', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Home overview' })).toBeVisible();

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(mobileOverflow).toBe(false);
    await page.screenshot({ path: 'tests/e2e/screenshots/7-mobile-viewport.png' });

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: 'Home overview' })).toBeVisible();
    const tabletOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(tabletOverflow).toBe(false);
    await page.screenshot({ path: 'tests/e2e/screenshots/7-tablet-viewport.png' });

    // Restore standard desktop viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(desktopOverflow).toBe(false);

    // 2. Form Validation Resilience: Malformed Dates and Negative Units
    await page.getByRole('tab', { name: /^Bills$/i }).click();
    await page.locator('input[name="billing_period_start"]').fill('2026-06-30');
    await page.locator('input[name="billing_period_end"]').fill('2026-05-01');
    await page.locator('input[name="total_units_kwh"]').fill('-50');

    await page.getByRole('button', { name: /Preview breakdown/i }).click();

    await expect(page.getByText(/End date cannot be earlier than start date/i)).toBeVisible();
    await expect(page.getByText(/Consumption cannot be negative/i)).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/8-validation-errors.png' });

    // 3. REFIT Power Ingestion Verification (Watts -> Trapezoidal kWh)
    await page.getByRole('tab', { name: /Import CSV/i }).click();

    const refitPowerCsv = `Time,Unix,Aggregate
2014-04-01 00:00:00,1396310400,1500
2014-04-01 00:00:08,1396310408,1500
2014-04-01 00:00:16,1396310416,1800`;

    await page.locator('input[type="file"]').setInputFiles({
      name: 'refit_house1_sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(refitPowerCsv),
    });

    await expect(page.getByText(/CSV Validation Preview/i)).toBeVisible();
    await expect(page.getByText(/trapezoidal numerical integration/i)).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/9-refit-power-preview.png' });

    await page.getByRole('button', { name: /Confirm & Save.*Readings/i }).click();

    await expect(page.getByText('Meter readings active').first()).toBeVisible();
    await expect(page.getByText('Hourly usage curve')).toBeVisible();

    // 4. Privacy Purge & Audit Verification
    await page.getByRole('tab', { name: /Privacy & data/i }).click();
    await page.getByRole('button', { name: 'Delete all data' }).click();
    await page.getByRole('button', { name: 'Yes, delete everything' }).click();
    await expect(page.getByText('All household data was permanently wiped from IndexedDB.')).toBeVisible();
  });
});
