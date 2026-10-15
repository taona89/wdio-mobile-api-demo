import { STATUS_CODES } from 'node:http';
import { expect, test, type APIResponse } from '@playwright/test';

/**
 * Assert status and JSON content type, then return the parsed body. Checking in this order
 * means a server error reads as "expected 200, got 500", not as a JSON parse error.
 *
 * `note` is added to the step's title, for a status that is asserted because it is what the API
 * does rather than what it should do.
 */
export function expectJson(response: APIResponse, status: number, note?: string): Promise<unknown> {
    const title = `The response is ${status} with a JSON body${note ? ` (${note})` : ''}`;
    return test.step(title, async () => {
        expect(response.status(), `HTTP status of ${response.url()}`).toBe(status);
        expect(response.headers()['content-type'], 'Content-Type').toContain('application/json');
        return response.json() as Promise<unknown>;
    });
}

/**
 * Assert an error response. This API never answers an error in JSON: it sends Express's default,
 * the status's reason phrase as plain text (403 "Forbidden", 404 "Not Found", 418 "I'm a Teapot"),
 * so that is the whole of its shape.
 */
export function expectPlainTextError(response: APIResponse, status: number): Promise<void> {
    const reason = STATUS_CODES[status] ?? '';
    return test.step(`The response is ${status} ${reason} as plain text`, async () => {
        expect(response.status(), `HTTP status of ${response.url()}`).toBe(status);
        expect(response.headers()['content-type'], 'Content-Type').toContain('text/plain');
        expect(await response.text(), 'body').toBe(reason);
    });
}
