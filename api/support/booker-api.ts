import type { APIRequestContext, APIResponse } from '@playwright/test';
import { ADMIN } from './env.js';
import type { Booking } from './schemas.js';

export interface Credentials {
    username: string;
    password: string;
}

/**
 * Thin client over Playwright's built-in APIRequestContext. It owns endpoints and headers;
 * tests own every assertion, so a failing test always points at the behaviour, not the client.
 */
export class BookerApi {
    constructor(private readonly request: APIRequestContext) {}

    createToken(credentials: Credentials = ADMIN): Promise<APIResponse> {
        return this.request.post('/auth', { data: credentials });
    }

    /** Accepts any body so negative tests can send invalid payloads. */
    createBooking(booking: Partial<Booking> | Record<string, unknown>): Promise<APIResponse> {
        return this.request.post('/booking', { data: booking });
    }

    getBooking(id: number): Promise<APIResponse> {
        return this.request.get(`/booking/${id}`);
    }

    /** Authorised with a token from /auth, sent as the `token` cookie. Omit it to call unauthenticated. */
    deleteBooking(id: number, token?: string): Promise<APIResponse> {
        return this.request.delete(`/booking/${id}`, {
            headers: token ? { Cookie: `token=${token}` } : {},
        });
    }

    /**
     * Basic auth is the API's other documented way to authorise. Cleanup uses it so tidying up
     * never depends on /auth, which is itself under test.
     */
    deleteBookingAsAdmin(id: number): Promise<APIResponse> {
        const basic = Buffer.from(`${ADMIN.username}:${ADMIN.password}`).toString('base64');
        return this.request.delete(`/booking/${id}`, { headers: { Authorization: `Basic ${basic}` } });
    }
}
