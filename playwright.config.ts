import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3008',
    trace: 'off',
  },
  webServer: {
    command: 'node ./node_modules/next/dist/bin/next start -p 3008',
    url: 'http://127.0.0.1:3008',
    reuseExistingServer: false,
    timeout: 60 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
