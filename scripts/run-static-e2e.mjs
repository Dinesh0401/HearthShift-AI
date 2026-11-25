/**
 * Cross-platform helper to run Playwright E2E suite against the compiled static `out/` export.
 * Exits with the exact Playwright child process exit code.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cliPath = path.resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
const extraArgs = process.argv.slice(2);

const result = spawnSync(process.execPath, [cliPath, 'test', ...extraArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    E2E_MODE: 'static',
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
