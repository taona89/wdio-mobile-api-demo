import type { Booking } from './schemas.js';

/**
 * Builds a valid booking payload.
 *
 * The server normalises what it stores (helpers/parser.js in restful-booker): it trims names,
 * parseInt()s the price and reformats dates to YYYY-MM-DD. The builder produces data that is
 * already in that canonical form, so "response equals request" is a fair, exact assertion.
 * Dates are calendar dates (UTC) so they round-trip unchanged on the UTC-hosted API.
 */
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const daysFromToday = (days: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return toIsoDate(date);
};

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export function buildBooking(overrides: Partial<Booking> = {}): Booking {
    const nights = randomInt(1, 7);
    const checkInOffset = randomInt(7, 60);
    return {
        firstname: 'Qa',
        lastname: `Tester${randomInt(1000, 9999)}`,
        totalprice: randomInt(100, 2000),
        depositpaid: true,
        bookingdates: {
            checkin: daysFromToday(checkInOffset),
            checkout: daysFromToday(checkInOffset + nights),
        },
        additionalneeds: 'Breakfast',
        ...overrides,
    };
}
