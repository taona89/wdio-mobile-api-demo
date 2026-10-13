import { test, expect } from '../support/fixtures.js';
import { expectJson } from '../support/assertions.js';
import { buildBooking } from '../support/booking-builder.js';
import { BookingSchema, CreatedBookingSchema, type Booking } from '../support/schemas.js';

/** Payload variants covering the optional field and both values of the boolean. */
const createCases: { name: string; payload: () => Partial<Booking> }[] = [
    { name: 'a full payload', payload: () => buildBooking() },
    {
        name: 'a payload without the optional additionalneeds field',
        payload: () => {
            const { additionalneeds: _omitted, ...rest } = buildBooking();
            return rest;
        },
    },
    { name: 'a payload with the deposit not paid', payload: () => buildBooking({ depositpaid: false }) },
];

test.describe('POST /booking - create booking', () => {
    for (const { name, payload: makePayload } of createCases) {
        test(`returns the created booking matching the request, for ${name}`, async ({ bookings }) => {
            const payload = makePayload();

            const { response } = await bookings.create(payload);

            const body = await expectJson(response, 200);
            await test.step('The body is a booking id and a booking equal to the request', () => {
                expect(CreatedBookingSchema.parse(body).booking).toEqual(payload);
            });
        });
    }

    test('persists the booking so it can be read back by id', async ({ api, bookings }) => {
        const payload = buildBooking();
        const { response } = await bookings.create(payload);
        const { bookingid } = CreatedBookingSchema.parse(await expectJson(response, 200));

        const stored = BookingSchema.parse(await expectJson(await api.getBooking(bookingid), 200));

        // A GET equal to the request proves the data was stored, not just echoed back.
        await test.step('The stored booking equals the request', () => {
            expect(stored).toEqual(payload);
        });
    });

    test('rejects a booking that is missing a required field', async ({ bookings }) => {
        const { lastname: _missing, ...payload } = buildBooking();

        const { response, body } = await bookings.create(payload);

        test.info().annotations.push({
            type: 'observation',
            description: `Missing required field answered with HTTP ${response.status()}; a 400 would be expected.`,
        });
        await test.step(`The request is rejected: HTTP ${response.status()}, where a 400 would be expected`, () => {
            expect(response.ok(), 'request should be rejected').toBe(false);
        });
        await test.step('No booking is created', () => {
            expect(body, 'no booking should be created').toBeNull();
        });
    });
});
