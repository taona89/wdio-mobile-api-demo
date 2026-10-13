import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { request } from '@playwright/test';
import { API_BASE_URL } from './env.js';

/** Must match `resultsDir` in playwright.config.ts. */
const ALLURE_RESULTS_DIR = join(import.meta.dirname, '..', 'allure-results');

/**
 * Wake the Heroku dyno before the suite starts, so the first test isn't penalised by a cold
 * start, and stop early with one clear error if the API is down. GET /ping answers 201 when healthy.
 */
export default async function globalSetup(): Promise<void> {
    // allure-playwright only adds to its results directory, and Allure reports every result file
    // it finds, so a previous run's tests would otherwise be counted again.
    rmSync(ALLURE_RESULTS_DIR, { recursive: true, force: true });

    const context = await request.newContext({ baseURL: API_BASE_URL });
    try {
        const response = await context.get('/ping', { timeout: 60_000 });
        if (response.status() !== 201) {
            throw new Error(`Health check failed: GET /ping returned ${response.status()} (expected 201)`);
        }
    } finally {
        await context.dispose();
    }
}
