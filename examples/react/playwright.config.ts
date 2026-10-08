import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'react/playwright-report' }]]
    : 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev:integration --prefix ..',
    url: 'http://localhost:4000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
