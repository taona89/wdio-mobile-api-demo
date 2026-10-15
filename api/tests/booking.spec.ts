import { test, expect, knownDefect } from '../support/fixtures.js';
import { expectJson, expectPlainTextError } from '../support/assertions.js';
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

const REQUIRED_FIELDS = [
    'firstname',
    'lastname',
    'totalprice',
    'depositpaid',
    'bookingdates',
    'checkin',
    'checkout',
] as const;

/** A valid booking without one required field. `checkin` and `checkout` sit inside `bookingdates`. */
function without(field: (typeof REQUIRED_FIELDS)[number]): Record<string, unknown> {
    const booking = buildBooking();
    const dates: Record<string, unknown> = { ...booking.bookingdates };
    const payload: Record<string, unknown> = { ...booking, bookingdates: dates };
    delete (field === 'checkin' || field === 'checkout' ? dates : payload)[field];
    return payload;
}

const ANSWERS_200 = 'Answers 200 OK and creates the booking.';

/**
 * Invalid payloads, each probed against the live API. The spec for all of them is the same: 400 Bad
 * Request, and nothing stored. `answers` and `stores` record where the API departs from that today;
 * each one makes the matching test a known defect (see `knownDefect` in support/fixtures.ts).
 *
 * The first eight have neither: the API answers them 500, and a 5xx is never a known defect, so
 * both of their tests fail until the API is fixed (see `verdict` in support/fixtures.ts).
 */
const invalidBookings: {
    name: string;
    payload: () => Record<string, unknown>;
    answers?: string;
    stores?: string;
}[] = [
    ...REQUIRED_FIELDS.map((field) => ({ name: `without ${field}`, payload: () => without(field) })),
    { name: 'with a number as firstname', payload: () => ({ ...buildBooking(), firstname: 123 }) },
    {
        name: 'with an empty firstname',
        payload: () => ({ ...buildBooking(), firstname: '' }),
        answers: ANSWERS_200,
        stores: 'Stores the booking with an empty firstname.',
    },
    {
        name: 'with a totalprice that is not a number',
        payload: () => ({ ...buildBooking(), totalprice: 'abc' }),
        answers: ANSWERS_200,
        stores: 'Stores the booking with totalprice null.',
    },
    {
        name: 'with a negative totalprice',
        payload: () => buildBooking({ totalprice: -500 }),
        answers: ANSWERS_200,
        stores: 'Stores the booking with totalprice -500.',
    },
    {
        name: 'with depositpaid "no"',
        payload: () => ({ ...buildBooking(), depositpaid: 'no' }),
        answers: ANSWERS_200,
        stores: 'Stores the booking with depositpaid true: any non-empty string reads as paid.',
    },
    {
        name: 'with checkout before checkin',
        payload: () => {
            const { bookingdates, ...rest } = buildBooking();
            return {
                ...rest,
                bookingdates: { checkin: bookingdates.checkout, checkout: bookingdates.checkin },
            };
        },
        answers: ANSWERS_200,
        stores: 'Stores the booking with checkout before checkin.',
    },
    {
        name: 'with a checkin date that does not exist',
        payload: () => {
            const booking = buildBooking();
            return { ...booking, bookingdates: { ...booking.bookingdates, checkin: '2026-13-45' } };
        },
        answers: ANSWERS_200,
        stores: 'Stores the booking with checkin "0NaN-aN-aN".',
    },
];

/** The payload's unique name to search by: its lastname, or its firstname when the case removes the lastname. */
const nameOf = (payload: Record<string, unknown>): { firstname: string } | { lastname: string } =>
    typeof payload.lastname === 'string' && payload.lastname !== ''
        ? { lastname: payload.lastname }
        : { firstname: String(payload.firstname) };

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

    test('answers 418 for an Accept type it cannot produce', async ({ bookings }) => {
        const { response } = await bookings.create(buildBooking(), 'text/plain');

        await expectPlainTextError(response, 418);
    });

    test(
        'stores nothing when it answers 418',
        knownDefect(
            'Stores the booking although it answers 418, so a client that retries creates a duplicate.',
        ),
        async ({ bookings }) => {
            const payload = buildBooking();
            await bookings.create(payload, 'text/plain');

            expect(await bookings.findByName(nameOf(payload)), 'bookings stored under this name').toEqual([]);
        },
    );
});

// One property per test, so the status and the storage of each payload are reported, and fixed, on
// their own: a known-defect test would let a second, unrelated failure inside it go unnoticed.
test.describe('POST /booking - invalid payloads', () => {
    for (const { name, payload: makePayload, answers, stores } of invalidBookings) {
        test(`a booking ${name} is refused with 400`, knownDefect(answers), async ({ bookings }) => {
            const { response } = await bookings.create(makePayload());

            expect(response.status(), 'HTTP status').toBe(400);
        });

        test(`a booking ${name} is not stored`, knownDefect(stores), async ({ bookings }) => {
            const payload = makePayload();
            await bookings.create(payload);

            expect(await bookings.findByName(nameOf(payload)), 'bookings stored under this name').toEqual([]);
        });
    }
});
