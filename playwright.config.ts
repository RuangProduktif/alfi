import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', locale: 'id-ID', timezoneId: 'Asia/Jakarta', serviceWorkers: 'block', trace: 'off' },
  webServer: { command: 'node e2e/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120_000, stdout: 'ignore' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
