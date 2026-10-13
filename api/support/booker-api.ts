import { test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { ADMIN } from './env.js';
import { attachExchange } from './report.js';
import type { Booking } from './schemas.js';

export interface Credentials {
    username: string;
    password: string;
}

interface RequestOptions {
    data?: unknown;
    headers?: Record<string, string>;
}

/**
 * Thin client over Playwright's built-in APIRequestContext. It owns endpoints and headers;
 * tests own every assertion, so a failing test always points at the behaviour, not the client.
 */
export class BookerApi {
    constructor(private readonly request: APIRequestContext) {}

    createToken(credentials: Credentials = ADMIN): Promise<APIResponse> {
        return this.send('POST /auth', 'POST', '/auth', { data: credentials });
    }

    /** Accepts any body so negative tests can send invalid payloads. */
    createBooking(booking: Partial<Booking> | Record<string, unknown>): Promise<APIResponse> {
        return this.send('POST /booking', 'POST', '/booking', { data: booking });
    }

    getBooking(id: number): Promise<APIResponse> {
        return this.send(`GET /booking/${id}`, 'GET', `/booking/${id}`);
    }

    /** Authorised with a token from /auth, sent as the `token` cookie. Omit it to call unauthenticated. */
    deleteBooking(id: number, token?: string): Promise<APIResponse> {
        return this.send(
            `DELETE /booking/${id} ${token ? 'with the token' : 'without a token'}`,
            'DELETE',
            `/booking/${id}`,
            {
                headers: token ? { Cookie: `token=${token}` } : {},
            },
        );
    }

    /**
     * Basic auth is the API's other documented way to authorise. Cleanup uses it so tidying up
     * never depends on /auth, which is itself under test.
     */
    deleteBookingAsAdmin(id: number): Promise<APIResponse> {
        const basic = Buffer.from(`${ADMIN.username}:${ADMIN.password}`).toString('base64');
        return this.send(`DELETE /booking/${id} as admin`, 'DELETE', `/booking/${id}`, {
            headers: { Authorization: `Basic ${basic}` },
        });
    }

    /**
     * Every request is its own named step with the exchange attached, so a report reads
     * "POST /booking" with its payload and response rather than a bare "POST".
     */
    private send(
        title: string,
        method: string,
        path: string,
        options: RequestOptions = {},
    ): Promise<APIResponse> {
        return test.step(title, async () => {
            const response = await this.request.fetch(path, { method, ...options });
            await attachExchange(method, response, options.data);
            return response;
        });
    }
}
