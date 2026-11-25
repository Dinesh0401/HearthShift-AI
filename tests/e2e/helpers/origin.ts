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
