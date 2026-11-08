import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Always use a loopback Vite server in mock mode: these tests MUST NOT modify
// user records on the deployed Worker, Pages preview, or production domain.
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: './playwright-report' }],
  ],
  outputDir: './test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    locale: 'id-ID',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    cwd: webRoot,
    url: 'http://127.0.0.1:4173/',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      VITE_USE_MOCK: 'true',
      VITE_API_URL: '',
    },
  },
});
