import { expect, type APIResponse } from '@playwright/test';

/**
 * Assert status and JSON content type, then return the parsed body. Checking in this order
 * means a server error reads as "expected 200, got 500", not as a JSON parse error.
 */
export async function expectJson(response: APIResponse, status: number): Promise<unknown> {
    expect(response.status(), `HTTP status of ${response.url()}`).toBe(status);
    expect(response.headers()['content-type'], 'Content-Type').toContain('application/json');
    return response.json();
}
