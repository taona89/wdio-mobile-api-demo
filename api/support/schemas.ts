import { z } from 'zod';

/**
 * Response schemas, taken from restful-booker's routes/index.js and helpers/parser.js. This is schema
 * validation, not contract testing: the API publishes no OpenAPI spec to verify against, and there is
 * no consumer to derive a contract from. `strictObject` rejects unknown keys, so an unexpected field
 * in a response fails the test.
 *
 * Error responses are not JSON, so they have no schema here: see `expectPlainTextError`.
 */

export const AuthSuccessSchema = z.strictObject({
    token: z.string().min(1),
});

export const AuthFailureSchema = z.strictObject({
    reason: z.literal('Bad credentials'),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const BookingSchema = z.strictObject({
    firstname: z.string(),
    lastname: z.string(),
    totalprice: z.number().int(),
    depositpaid: z.boolean(),
    bookingdates: z.strictObject({
        checkin: isoDate,
        checkout: isoDate,
    }),
    additionalneeds: z.string().optional(),
});

export const CreatedBookingSchema = z.strictObject({
    bookingid: z.number().int().positive(),
    booking: BookingSchema,
});

/** GET /booking: the ids of the bookings that match the query. */
export const BookingIdsSchema = z.array(z.strictObject({ bookingid: z.number().int().positive() }));

export type Booking = z.infer<typeof BookingSchema>;
