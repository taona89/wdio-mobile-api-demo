import { defineConfig } from '@playwright/test';
import { API_BASE_URL } from './support/env.js';

export default defineConfig({
    testDir: './tests',
    // Restful Booker runs on Heroku and can take a while to wake up; globalSetup warms it first.
    globalSetup: './support/global-setup.ts',
    timeout: 30_000,
    fullyParallel: true,
    // Failures should be visible, not retried away. CI gets one retry for transient network errors.
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    outputDir: 'test-results',
    use: {
        baseURL: API_BASE_URL,
        // Restful Booker answers 418 for Accept values it does not support, so be explicit.
        extraHTTPHeaders: { Accept: 'application/json' },
    },
});
