import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/pwa.spec.ts',
  timeout: 150_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'artifacts/pwa-test-results',
  reporter: [['list'], ['html', { outputFolder: 'artifacts/pwa-report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    baseURL: 'http://127.0.0.1:4187/manabi-sugoroku/',
    viewport: { width: 1366, height: 768 },
    reducedMotion: 'reduce',
    serviceWorkers: 'allow',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187/manabi-sugoroku/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
