import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Booking } from './schemas.js';

export interface Credentials {
    username: string;
    password: string;
}

/** Documented default admin credentials for Restful Booker. */
export const ADMIN: Credentials = {
    username: process.env.BOOKER_USERNAME ?? 'admin',
    password: process.env.BOOKER_PASSWORD ?? 'password123',
};

/**
 * Thin client over Playwright's built-in APIRequestContext. Keeps endpoints and headers in
 * one place; tests own the assertions.
 */
export class BookerApi {
    constructor(private readonly request: APIRequestContext) {}

    createToken(credentials: Credentials = ADMIN): Promise<APIResponse> {
        return this.request.post('/auth', { data: credentials });
    }

    createBooking(booking: Booking): Promise<APIResponse> {
        return this.request.post('/booking', { data: booking });
    }

    getBooking(id: number): Promise<APIResponse> {
        return this.request.get(`/booking/${id}`);
    }

    deleteBooking(id: number, token: string): Promise<APIResponse> {
        return this.request.delete(`/booking/${id}`, { headers: { Cookie: `token=${token}` } });
    }
}
