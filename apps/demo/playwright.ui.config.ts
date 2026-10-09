import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './ui-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 90_000,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'ui-playwright-report' }]]
    : 'list',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'ios', use: { ...devices['iPhone 13'] } },
    {
      name: 'narrow',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 740 } },
    },
  ],
  webServer: {
    command: 'npm run dev:mock -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
