import { test as base, expect, type APIResponse } from '@playwright/test';
import { BookerApi } from './booker-api.js';
import type { Booking } from './schemas.js';

interface CreatedBooking {
    response: APIResponse;
    /** Raw JSON body (or null if it was not JSON); tests validate it with the schemas. */
    body: unknown;
}

interface Fixtures {
    api: BookerApi;
    /** Creates bookings and deletes every one of them after the test, pass or fail. */
    bookings: { create: (payload: Partial<Booking>) => Promise<CreatedBooking> };
}

const bookingIdOf = (body: unknown): number | undefined => {
    const id = (body as { bookingid?: unknown } | null)?.bookingid;
    return typeof id === 'number' ? id : undefined;
};

export const test = base.extend<Fixtures>({
    api: async ({ request }, use) => {
        await use(new BookerApi(request));
    },

    bookings: async ({ api }, use) => {
        const created: number[] = [];

        await use({
            create: async (payload) => {
                const response = await api.createBooking(payload);
                const body: unknown = await response.json().catch(() => null);
                // Register the id before the test asserts anything, so a failed assertion can't leak data.
                const id = bookingIdOf(body);
                if (id !== undefined) created.push(id);
                return { response, body };
            },
        });

        for (const id of created) {
            const response = await api.deleteBookingAsAdmin(id);
            // 201 = deleted (this API's success code for DELETE). 405 = already gone: a test deleted it
            // itself, or the public host's periodic data reset removed it. Anything else is a real problem.
            expect.soft([201, 405], `cleanup of booking ${id}`).toContain(response.status());
        }
    },
});

export { expect };
