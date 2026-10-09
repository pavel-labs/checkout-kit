import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/site',
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4180',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run site:preview',
    url: 'http://localhost:4180/checkout-kit/',
    reuseExistingServer: !process.env.CI,
  },
})
