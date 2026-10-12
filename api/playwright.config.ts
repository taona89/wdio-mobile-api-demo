import { defineConfig } from '@playwright/test';
import { API_BASE_URL } from './support/env.js';

export default defineConfig({
    testDir: './tests',
    // The API is hosted on Heroku and can take a while to wake up; global setup pings it first.
    globalSetup: './support/global-setup.ts',
    timeout: 30_000,
    // Safe in parallel: every test only reads and deletes bookings it created itself.
    fullyParallel: true,
    // No retries locally, so failures stay visible. CI gets one retry for transient network errors.
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    outputDir: 'test-results',
    use: {
        baseURL: API_BASE_URL,
        // The server matches Accept exactly and answers 418 for values it does not support
        // (e.g. "application/json, text/plain"), so state the format explicitly.
        extraHTTPHeaders: { Accept: 'application/json' },
    },
});
