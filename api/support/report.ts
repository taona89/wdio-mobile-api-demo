import { test, type APIResponse } from '@playwright/test';

/** Values the reports must never show: a report is shared far more widely than a `.env` file. */
const SECRET_KEYS = new Set(['password', 'token']);
const MASK = '*** masked ***';

/** A copy of `value` with every secret replaced, at any depth. */
function redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redact);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, inner]) => [key, SECRET_KEYS.has(key) ? MASK : redact(inner)]),
        );
    }
    return value;
}

const parseBody = (text: string): unknown => {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        // Not JSON (this API answers some errors in plain text), so show it as it came.
        return text;
    }
};

const attachJson = (name: string, content: unknown): Promise<void> =>
    test.info().attach(name, {
        body: JSON.stringify(redact(content), null, 2),
        contentType: 'application/json',
    });

/**
 * Attach what was sent and what came back to the current step, so the reports show the exchange
 * a test is asserting on. Request headers are left out on purpose: the only ones worth showing
 * carry credentials, and the step's title already says how the call was authorised.
 */
export async function attachExchange(
    method: string,
    response: APIResponse,
    requestBody?: unknown,
): Promise<void> {
    await attachJson('Request', {
        method,
        url: response.url(),
        ...(requestBody === undefined ? {} : { body: requestBody }),
    });
    await attachJson('Response', {
        status: response.status(),
        statusText: response.statusText(),
        contentType: response.headers()['content-type'],
        body: parseBody(await response.text()),
    });
}
