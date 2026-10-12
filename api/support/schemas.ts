import { z } from 'zod';

/** Response contracts for the endpoints under test, validated on every call. */

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

export type Booking = z.infer<typeof BookingSchema>;
export type CreatedBooking = z.infer<typeof CreatedBookingSchema>;
