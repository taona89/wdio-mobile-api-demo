import { request } from '@playwright/test';
import { API_BASE_URL } from './env.js';

/**
 * Wake the Heroku dyno before the suite starts, so the first test isn't penalised by a cold
 * start, and stop early with one clear error if the API is down. GET /ping answers 201 when healthy.
 */
export default async function globalSetup(): Promise<void> {
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
