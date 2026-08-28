import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const isPpr = process.env.PERMIX_NEXT_VERSION === '16.3.3'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    baseURL,
    trace: 'off',
  },
  projects: [
    {
      name: 'compat',
      testMatch: /compat\.spec\.ts/,
      use: { viewport: { width: 1280, height: 720 } },
    },
    ...(isPpr
      ? [
          {
            name: 'desktop',
            testMatch: /instant\.spec\.ts/,
            use: { viewport: { width: 1280, height: 720 } },
          },
          {
            name: 'mobile',
            testMatch: /instant\.spec\.ts/,
            use: { viewport: { width: 390, height: 844 } },
          },
        ]
      : []),
  ],
})
