import { test, expect, knownDefect } from '../support/fixtures.js';
import { expectJson, expectPlainTextError } from '../support/assertions.js';
import { buildBooking } from '../support/booking-builder.js';
import { AuthFailureSchema, AuthSuccessSchema, CreatedBookingSchema } from '../support/schemas.js';

const BAD_CREDENTIALS = { username: 'admin', password: 'wrong-password' };

test.describe('POST /auth - create token', () => {
    test('returns a token for valid credentials', async ({ api }) => {
        const body = await expectJson(await api.createToken(), 200);

        await test.step('The body holds a token and nothing else', () => {
            expect(AuthSuccessSchema.parse(body).token).toMatch(/\S+/);
        });
    });

    test('the token authorises a protected operation, which is refused without it or with a made-up one', async ({
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
            await expectPlainTextError(await api.deleteBooking(bookingid), 403);
        });
        await test.step('Deleting it with a made-up token is refused with 403', async () => {
            // Same length and alphabet as the real token, one character different, so only a server
            // that checks the token's value refuses it, not one that checks a token is present.
            const madeUp = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
            await expectPlainTextError(await api.deleteBooking(bookingid, madeUp), 403);
        });
        await test.step('Deleting it with the token succeeds with 201', async () => {
            expect((await api.deleteBooking(bookingid, token)).status(), 'with the token').toBe(201);
        });
        await test.step('The booking is gone: reading it answers 404', async () => {
            await expectPlainTextError(await api.getBooking(bookingid), 404);
        });
    });

    // Invalid credentials are two tests, not one. The missing token holds today and must stay
    // checked; the status is a known defect, and an expected failure passes on any failure at all.
    test('does not return a token for invalid credentials', async ({ api }) => {
        const response = await api.createToken(BAD_CREDENTIALS);

        // The strict schema only allows { reason: "Bad credentials" }, so a token would fail it.
        await test.step('The body is { reason: "Bad credentials" } and holds no token', async () => {
            expect(response.headers()['content-type'], 'Content-Type').toContain('application/json');
            AuthFailureSchema.parse(await response.json());
        });
    });

    test(
        'refuses invalid credentials with 401',
        knownDefect('Answers 200 OK, with { "reason": "Bad credentials" } as the body.'),
        async ({ api }) => {
            const response = await api.createToken(BAD_CREDENTIALS);

            expect(response.status(), 'HTTP status').toBe(401);
        },
    );
});
