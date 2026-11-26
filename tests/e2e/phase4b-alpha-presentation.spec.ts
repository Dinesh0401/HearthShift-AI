import { test, expect } from '@playwright/test';
import { isAllowedAppOrigin, assertHostedTargetSafety } from './helpers/origin';

test.describe('HearthShift AI — Phase 4B Static Alpha UX, Manifest, Changelog & Zero-Telemetry Feedback', () => {
  test('verifies static PWA assets, product guide, v0.1.0-alpha changelog, honest offline disclosures, and zero-PII feedback draft', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    const sameOriginMutationsOrBodies: { url: string; method: string; postData: string | null }[] = [];
    const sameOriginSensitiveQueries: string[] = [];
    const cspViolations: string[] = [];

    const sensitiveTokens = ['PRIVATE-METER-9988', '515', 'kwh', 'hearthshift_feedback'];

    page.on('request', (request) => {
      const url = request.url();
      if (!isAllowedAppOrigin(url)) {
        externalRequests.push(`${request.method()} ${url}`);
        return;
      }
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        const method = request.method();
        const postData = request.postData();
        if (method !== 'GET' && method !== 'HEAD') {
          sameOriginMutationsOrBodies.push({ url, method, postData });
        } else if (postData) {
          sameOriginMutationsOrBodies.push({ url, method, postData });
        }
        const qIdx = url.indexOf('?');
        if (qIdx !== -1) {
          const queryPart = url.slice(qIdx).toLowerCase();
          for (const token of sensitiveTokens) {
            if (queryPart.includes(token.toLowerCase())) {
              sameOriginSensitiveQueries.push(url);
            }
          }
        }
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

    const rootRes = await page.goto('/');
    expect(rootRes?.status()).toBe(200);
    const headers = rootRes!.headers();
    assertHostedTargetSafety(page.url(), headers);
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['x-frame-options']).toBe('DENY');

    const manifestRes = await page.request.get('/manifest.json');
    expect(manifestRes.status()).toBe(200);
    const manifestJson = await manifestRes.json();
    expect(manifestJson.name).toBe('HearthShift AI');

    const iconRes = await page.request.get('/icon.svg');
    expect(iconRes.status()).toBe(200);

    // Seed private bill in Bills tab to prove Feedback NEVER reads IndexedDB
    await page.getByRole('tab', { name: /^Bills$/i }).click();
    await page.locator('input[name="billing_period_start"]').fill('2026-05-01');
    await page.locator('input[name="billing_period_end"]').fill('2026-06-30');
    await page.locator('input[name="total_units_kwh"]').fill('515');
    await page.locator('input[name="bill_reference_no"]').fill('PRIVATE-METER-9988');
    await page.getByRole('button', { name: /^Save bill$/i }).click();
    await expect(page.getByRole('cell', { name: '515 kWh' })).toBeVisible();

    // Switch to clean Home Overview and verify "How this works" progressive disclosure
    await page.getByRole('tab', { name: /^Overview$/i }).click();
    const howItWorksBtn = page.getByRole('button', { name: /^How this works$/i });
    await expect(howItWorksBtn).toBeVisible();
    await howItWorksBtn.click();
    await expect(
      page.getByText(/Service Worker offline page caching is not implemented yet in v0\.1\.0-alpha/i)
    ).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/phase4b-alpha-overview.png' });

    // Changelog dialog
    await page.getByRole('button', { name: /^Changelog$/i }).click();
    const changelogDialog = page.getByRole('dialog');
    await expect(changelogDialog).toBeVisible();
    await expect(changelogDialog.getByText(/No Offline Service Worker Caching/i)).toBeVisible();
    await expect(changelogDialog.getByText(/No IPMVP Option C/i)).toBeVisible();
    await changelogDialog.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(changelogDialog).toBeHidden();

    // Feedback modal (0 DB records, XSS stripped, consent-gated links)
    await page.getByRole('button', { name: /^Feedback$/i }).click();
    const feedbackDialog = page.getByRole('dialog');
    await expect(feedbackDialog).toBeVisible();
    await expect(
      feedbackDialog.getByText(/never reads IndexedDB bills, interval CSVs, or consumer numbers/i)
    ).toBeVisible();

    await feedbackDialog
      .locator('#feedback-notes')
      .fill('<script>xss()</script> Clean overview makes threshold easy to see.');
    const previewText = await feedbackDialog.getByTestId('feedback-payload-preview').textContent();
    expect(previewText).toContain('"householdBillsIncluded": 0');
    expect(previewText).toContain('"intervalReadingsIncluded": 0');
    expect(previewText).toContain('"consumerReferencesIncluded": 0');
    expect(previewText).not.toContain('PRIVATE-METER-9988');
    expect(previewText).not.toContain('<script>');

    await page.screenshot({ path: 'tests/e2e/screenshots/phase4b-feedback-modal.png' });

    await expect(feedbackDialog.getByRole('link', { name: /GitHub issue/i })).toHaveCount(0);
    await feedbackDialog.getByRole('checkbox').check();
    await expect(feedbackDialog.getByRole('link', { name: /GitHub issue/i })).toBeVisible();
    await expect(feedbackDialog.getByRole('link', { name: /Email draft/i })).toBeVisible();

    const [fbDownload] = await Promise.all([
      page.waitForEvent('download'),
      feedbackDialog.getByRole('button', { name: /Download JSON/i }).click(),
    ]);
    expect(fbDownload.suggestedFilename()).toContain('hearthshift_feedback_');

    await feedbackDialog.getByRole('button', { name: 'Close', exact: true }).first().click();
    await page.getByRole('tab', { name: /Privacy & data/i }).click();
    await page.getByRole('button', { name: 'Delete all data' }).click();
    await page.getByRole('button', { name: 'Yes, delete everything' }).click();
    await expect(page.getByText('All household data was permanently wiped from IndexedDB.')).toBeVisible();

    const runtimeCsp = await page.evaluate(
      () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []
    );
    cspViolations.push(...runtimeCsp);

    expect(externalRequests).toEqual([]);
    expect(sameOriginMutationsOrBodies).toEqual([]);
    expect(sameOriginSensitiveQueries).toEqual([]);
    expect(cspViolations).toEqual([]);
  });
});
