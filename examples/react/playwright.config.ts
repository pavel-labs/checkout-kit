import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  reporter: process.env.CI
    ? [
        ['github'],
        [
          'html',
          {
            open: 'never',
            outputFolder: fileURLToPath(new URL('./playwright-report', import.meta.url)),
          },
        ],
      ]
    : 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev:integration',
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    url: 'http://localhost:4000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
