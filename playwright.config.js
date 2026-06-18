import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: 'http://127.0.0.1:8017',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    },
    {
      name: 'ipad-chrome-approx',
      use: {
        ...devices['iPad Pro 11'],
        browserName: 'chromium',
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});
