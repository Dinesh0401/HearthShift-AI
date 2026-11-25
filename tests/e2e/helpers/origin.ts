import { expect } from '@playwright/test';

/**
 * Origin and telemetry classifier shared across Playwright E2E specs so the same
 * security assertions execute cleanly against Next.js localhost, local static `out/`,
 * and live Cloudflare Pages HTTPS preview/production URLs (`E2E_BASE_URL`).
 */
export function isAllowedAppOrigin(url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return true;
  }

  const configuredBase = process.env.E2E_BASE_URL;
  if (configuredBase) {
    try {
      const targetOrigin = new URL(configuredBase).origin;
      return url.startsWith(`${targetOrigin}/`) || url === targetOrigin;
    } catch {
      return false;
    }
  }

  const port = process.env.E2E_PORT || '3008';
  return (
    url.startsWith(`http://localhost:${port}/`) ||
    url === `http://localhost:${port}` ||
    url.startsWith(`http://127.0.0.1:${port}/`) ||
    url === `http://127.0.0.1:${port}`
  );
}

/**
 * When `E2E_BASE_URL` is provided for hosted Gate 3/4/6 checks, verifies tests
 * actually hit that hosted non-localhost origin and enforces HTTPS/HSTS headers.
 */
export function assertHostedTargetSafety(
  actualPageUrl: string,
  responseHeaders: Record<string, string>
): void {
  const configuredBase = process.env.E2E_BASE_URL;
  if (!configuredBase) {
    return;
  }

  const expected = new URL(configuredBase);
  const actual = new URL(actualPageUrl);
  expect(actual.origin).toBe(expected.origin);
  expect(actual.hostname).not.toMatch(/^(localhost|127\.0\.0\.1)$/i);

  if (expected.protocol === 'https:') {
    expect(actual.protocol).toBe('https:');
    expect(responseHeaders['strict-transport-security']).toContain('max-age=');
  }
}
