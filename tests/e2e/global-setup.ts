import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.resolve(process.cwd(), '.playwright', 'e2e-server.json');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url: string, childPid: number | undefined, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status < 500) {
        return;
      }
    } catch {
      // Server still booting
    }
    if (childPid) {
      try {
        process.kill(childPid, 0);
      } catch {
        throw new Error(`E2E server process (PID ${childPid}) exited prematurely before serving ${url}`);
      }
    }
    await sleep(250);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${url}`);
}

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });

  const hostedUrl = process.env.E2E_BASE_URL;
  if (hostedUrl) {
    const res = await fetch(hostedUrl, { method: 'GET' });
    if (res.status >= 400) {
      throw new Error(`Hosted E2E_BASE_URL ${hostedUrl} returned HTTP ${res.status}`);
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify({ managed: false, baseUrl: hostedUrl }, null, 2));
    return;
  }

  const port = process.env.E2E_PORT || '3008';
  const mode = process.env.E2E_MODE === 'static' ? 'static' : 'next';
  const baseUrl = `http://127.0.0.1:${port}`;

  // Clear any leftover process bound to the local E2E port from an aborted prior run
  if (process.platform === 'win32') {
    try {
      execFileSync(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Get-NetTCPConnection -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
        ],
        { stdio: 'ignore', windowsHide: true }
      );
    } catch {
      // Ignore if port is already clear
    }
  }

  let commandArgs: string[];
  if (mode === 'static') {
    const staticIndex = path.resolve(process.cwd(), 'out', 'index.html');
    if (!fs.existsSync(staticIndex)) {
      throw new Error(
        `Static export missing (${staticIndex}). Run NEXT_STATIC_EXPORT=true npm run build before E2E_MODE=static.`
      );
    }
    commandArgs = [path.resolve(process.cwd(), 'scripts', 'serve-static-out.mjs')];
  } else {
    const buildId = path.resolve(process.cwd(), '.next', 'BUILD_ID');
    if (!fs.existsSync(buildId)) {
      throw new Error(`Next.js production build missing (${buildId}). Run npm run build first.`);
    }
    commandArgs = [
      path.resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next'),
      'start',
      '-H',
      '127.0.0.1',
      '-p',
      port,
    ];
  }

  // Launch directly without shell wrapper or inherited stdio pipes so Windows Playwright
  // never blocks on open child pipe handles when exiting.
  const child = spawn(process.execPath, commandArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: port,
    },
    stdio: 'ignore',
    windowsHide: true,
    detached: process.platform !== 'win32',
  });

  if (!child.pid) {
    throw new Error(`Failed to spawn E2E ${mode} server process.`);
  }

  child.unref();

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ managed: true, pid: child.pid, mode, port, baseUrl }, null, 2)
  );

  await waitForUrl(baseUrl, child.pid, 45_000);
}
