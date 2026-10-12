import { test, expect } from '../support/fixtures.js';
import { expectJson } from '../support/assertions.js';
import { buildBooking } from '../support/booking-builder.js';
import { AuthFailureSchema, AuthSuccessSchema, CreatedBookingSchema } from '../support/schemas.js';

test.describe('POST /auth - create token', () => {
    test('returns a token for valid credentials', async ({ api }) => {
        const body = AuthSuccessSchema.parse(await expectJson(await api.createToken(), 200));

        expect(body.token).toMatch(/\S+/);
    });

    test('the token authorises a protected operation, and the operation is refused without it', async ({
        api,
        bookings,
    }) => {
        // Proves the token is usable, not just present. DELETE /booking/{id} requires authorisation.
        const { response, body } = await bookings.create(buildBooking());
        expect(response.status()).toBe(200);
        const { bookingid } = CreatedBookingSchema.parse(body);
        const { token } = AuthSuccessSchema.parse(await expectJson(await api.createToken(), 200));

        expect((await api.deleteBooking(bookingid)).status(), 'without a token').toBe(403);
        expect((await api.deleteBooking(bookingid, token)).status(), 'with the token').toBe(201);
        expect((await api.getBooking(bookingid)).status(), 'booking is gone').toBe(404);
    });

    test('does not return a token for invalid credentials', async ({ api }) => {
        test.info().annotations.push({
            type: 'observation',
            description: 'The API answers 200 OK (not 401) for bad credentials, with a "reason" body.',
        });

        const response = await api.createToken({ username: 'admin', password: 'wrong-password' });

        // The strict schema only allows { reason: "Bad credentials" }, so a token would fail it.
        AuthFailureSchema.parse(await expectJson(response, 200));
    });
});
