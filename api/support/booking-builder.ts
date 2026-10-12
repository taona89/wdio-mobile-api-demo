import type { Booking } from './schemas.js';

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const daysFromToday = (days: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return toIsoDate(date);
};

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Builds a valid booking payload, already in the form the server stores it.
 *
 * Restful Booker normalises input: helpers/validator.js trims names, and helpers/parser.js
 * parseInt()s the price and reformats dates as YYYY-MM-DD in the server's local time zone.
 * Sending canonical values (trimmed names, integer price, YYYY-MM-DD dates) makes
 * "response equals request" an exact, fair assertion.
 *
 * Time-zone note: the server parses "YYYY-MM-DD" as UTC midnight and formats it in local time.
 * The public host runs in UTC, so dates round-trip unchanged. A server west of UTC would shift
 * every date back a day, which these tests would (correctly) report as a defect.
 */
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
