import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.resolve(process.cwd(), '.playwright', 'e2e-server.json');

export default async function globalTeardown() {
  if (!fs.existsSync(STATE_FILE)) {
    return;
  }

  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const state = JSON.parse(raw) as { managed?: boolean; pid?: number };

    if (state.managed && state.pid) {
      if (process.platform === 'win32') {
        try {
          execFileSync('taskkill', ['/PID', String(state.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
          });
        } catch {
          // Process already exited
        }
      } else {
        try {
          process.kill(-state.pid, 'SIGTERM');
        } catch {
          try {
            process.kill(state.pid, 'SIGKILL');
          } catch {
            // Process already exited
          }
        }
      }
    }
  } finally {
    try {
      fs.unlinkSync(STATE_FILE);
    } catch {
      // Ignore cleanup error
    }
  }
}
