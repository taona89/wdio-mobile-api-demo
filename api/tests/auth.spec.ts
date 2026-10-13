import { test, expect } from '../support/fixtures.js';
import { expectJson } from '../support/assertions.js';
import { buildBooking } from '../support/booking-builder.js';
import { AuthFailureSchema, AuthSuccessSchema, CreatedBookingSchema } from '../support/schemas.js';

test.describe('POST /auth - create token', () => {
    test('returns a token for valid credentials', async ({ api }) => {
        const body = await expectJson(await api.createToken(), 200);

        await test.step('The body holds a token and nothing else', () => {
            expect(AuthSuccessSchema.parse(body).token).toMatch(/\S+/);
        });
    });

    test('the token authorises a protected operation, and the operation is refused without it', async ({
        api,
        bookings,
    }) => {
        // Proves the token is usable, not just present. DELETE /booking/{id} requires authorisation.
        const bookingid = await test.step('A booking exists', async () => {
            const { response, body } = await bookings.create(buildBooking());
            expect(response.status()).toBe(200);
            return CreatedBookingSchema.parse(body).bookingid;
        });
        const token = await test.step('A token is issued for the admin account', async () => {
            return AuthSuccessSchema.parse(await expectJson(await api.createToken(), 200)).token;
        });

        await test.step('Deleting the booking without a token is refused with 403', async () => {
            expect((await api.deleteBooking(bookingid)).status(), 'without a token').toBe(403);
        });
        await test.step('Deleting it with the token succeeds with 201', async () => {
            expect((await api.deleteBooking(bookingid, token)).status(), 'with the token').toBe(201);
        });
        await test.step('The booking is gone: reading it answers 404', async () => {
            expect((await api.getBooking(bookingid)).status(), 'booking is gone').toBe(404);
        });
    });

    test('does not return a token for invalid credentials', async ({ api }) => {
        test.info().annotations.push({
            type: 'observation',
            description: 'The API answers 200 OK (not 401) for bad credentials, with a "reason" body.',
        });

        const response = await api.createToken({ username: 'admin', password: 'wrong-password' });

        const body = await expectJson(response, 200, 'a 401 would be expected');
        // The strict schema only allows { reason: "Bad credentials" }, so a token would fail it.
        await test.step('The body is { reason: "Bad credentials" } and holds no token', () => {
            AuthFailureSchema.parse(body);
        });
    });
});
