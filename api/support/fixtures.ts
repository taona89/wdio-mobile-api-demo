import { test as base, expect } from '@playwright/test';
import { BookerApi } from './booker-api.js';
import { AuthSuccessSchema } from './schemas.js';

interface Fixtures {
    api: BookerApi;
    /** Register a booking id to be deleted after the test, keeping the shared API tidy. */
    trackBooking: (id: number) => void;
}

export const test = base.extend<Fixtures>({
    api: async ({ request }, use) => {
        await use(new BookerApi(request));
    },

    trackBooking: async ({ api }, use) => {
        const created: number[] = [];
        await use((id) => created.push(id));

        if (created.length === 0) return;
        const token = AuthSuccessSchema.parse(await (await api.createToken()).json()).token;
        for (const id of created) {
            const response = await api.deleteBooking(id, token);
            // Restful Booker answers 201 Created for a successful DELETE.
            expect.soft(response.status(), `cleanup of booking ${id}`).toBe(201);
        }
    },
});

export { expect };
