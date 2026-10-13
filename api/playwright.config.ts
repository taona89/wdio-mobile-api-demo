import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import { API_BASE_URL } from './support/env.js';

export default defineConfig({
    // Allure uses the project name as the parent suite, which groups these tests under "API" in
    // the combined report (`npm run report`), next to the mobile suite's "Mobile".
    name: 'API',
    testDir: './tests',
    // The API is hosted on Heroku and can take a while to wake up; global setup pings it first.
    globalSetup: './support/global-setup.ts',
    timeout: 30_000,
    // Safe in parallel: every test only reads and deletes bookings it created itself.
    fullyParallel: true,
    // No retries locally, so failures stay visible. CI gets one retry for transient network errors.
    retries: process.env.CI ? 1 : 0,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        // Absolute, because allure-playwright resolves resultsDir against the working directory
        // rather than this file.
        // `detail: false` keeps Playwright's own steps (hooks, fixtures, bare "POST", "expect") out
        // of the Allure report, leaving the named steps the tests and the API client declare.
        ['allure-playwright', { resultsDir: join(import.meta.dirname, 'allure-results'), detail: false }],
    ],
    outputDir: 'test-results',
    use: {
        baseURL: API_BASE_URL,
        // The server matches Accept exactly and answers 418 for values it does not support
        // (e.g. "application/json, text/plain"), so state the format explicitly.
        extraHTTPHeaders: { Accept: 'application/json' },
    },
});
