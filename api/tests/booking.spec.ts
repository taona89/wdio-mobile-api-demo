import { test, expect } from '../support/fixtures.js';
import { buildBooking } from '../support/booking-builder.js';
import { BookingSchema, CreatedBookingSchema } from '../support/schemas.js';

test.describe('POST /booking – create booking', () => {
    test('creates a booking whose data matches the request', async ({ api, trackBooking }) => {
        const payload = buildBooking();

        const response = await api.createBooking(payload);

        expect(response.status()).toBe(200);
        const body = CreatedBookingSchema.parse(await response.json());
        trackBooking(body.bookingid);

        expect(body.bookingid).toBeGreaterThan(0);
        expect(body.booking).toEqual(payload);
    });

    test('creates a booking without the optional additionalneeds field', async ({ api, trackBooking }) => {
        const { additionalneeds: _omitted, ...payload } = buildBooking();

        const response = await api.createBooking(payload);

        expect(response.status()).toBe(200);
        const body = CreatedBookingSchema.parse(await response.json());
        trackBooking(body.bookingid);

        expect(body.booking).toEqual(payload);
        expect(body.booking).not.toHaveProperty('additionalneeds');
    });

    test('persists the booking so it can be read back by id', async ({ api, trackBooking }) => {
        const payload = buildBooking();
        const created = CreatedBookingSchema.parse(await (await api.createBooking(payload)).json());
        trackBooking(created.bookingid);

        const response = await api.getBooking(created.bookingid);

        expect(response.status()).toBe(200);
        expect(BookingSchema.parse(await response.json())).toEqual(payload);
    });
});
