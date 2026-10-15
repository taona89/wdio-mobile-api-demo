import { test as base, expect, type APIResponse, type TestDetails } from '@playwright/test';
import { expectJson } from './assertions.js';
import { BookerApi, type NameFilter } from './booker-api.js';
import { BookingIdsSchema, type Booking } from './schemas.js';

interface CreatedBooking {
    response: APIResponse;
    /** Raw JSON body (or null if it was not JSON); tests validate it with the schemas. */
    body: unknown;
}

interface Fixtures {
    api: BookerApi;
    /** Creates bookings and deletes every one of them after the test, pass or fail. */
    bookings: {
        create: (
            payload: Partial<Booking> | Record<string, unknown>,
            accept?: string,
        ) => Promise<CreatedBooking>;
        /**
         * Ids of the stored bookings with this name. buildBooking() names are unique to one test, so
         * every match is this test's own and is registered for cleanup as well: a booking the API
         * stored without returning its id would otherwise outlive the test.
         */
        findByName: (name: NameFilter) => Promise<number[]>;
    };
    /** Automatic: fails a test on any 5xx, and expects a test declared with `knownDefect(...)` to fail. */
    verdict: void;
}

const KNOWN_DEFECT = 'known defect';

const bookingIdOf = (body: unknown): number | undefined => {
    const id = (body as { bookingid?: unknown } | null)?.bookingid;
    return typeof id === 'number' ? id : undefined;
};

export const test = base.extend<Fixtures>({
    api: async ({ request }, use) => {
        await use(new BookerApi(request));
    },

    bookings: async ({ api }, use) => {
        const created = new Set<number>();

        await use({
            create: async (payload, accept) => {
                const response = await api.createBooking(payload, accept);
                const body: unknown = await response.json().catch(() => null);
                // Register the id before the test asserts anything, so a failed assertion can't leak data.
                const id = bookingIdOf(body);
                if (id !== undefined) created.add(id);
                return { response, body };
            },
            findByName: async (name) => {
                const matches = BookingIdsSchema.parse(await expectJson(await api.findBookings(name), 200));
                const ids = matches.map(({ bookingid }) => bookingid);
                ids.forEach((id) => created.add(id));
                return ids;
            },
        });

        for (const id of created) {
            const response = await api.deleteBookingAsAdmin(id);
            // 201 = deleted (this API's success code for DELETE). 405 = already gone: a test deleted it
            // itself, or the public host's periodic data reset removed it. Anything else is a real problem.
            expect.soft([201, 405], `cleanup of booking ${id}`).toContain(response.status());
        }
    },

    /**
     * Judges the test once it has run, including the bookings cleanup, which is torn down first.
     *
     * Any 5xx fails the test, whatever it asserted and even if it declares a known defect: a server
     * error is a crash, never an outcome a test may expect. Otherwise a known defect is expected to
     * fail. That is decided here at the end, not with test.fail() up front, because an expected
     * failure would absorb the 5xx like any other failure.
     */
    verdict: [
        async ({ api }, use, testInfo) => {
            await use();

            if (api.serverErrors.length > 0) {
                throw new Error(
                    `The server failed: ${api.serverErrors.join('; ')}. A 5xx always fails the test, ` +
                        'known defect or not.',
                );
            }
            const defect = testInfo.annotations.find(({ type }) => type === KNOWN_DEFECT);
            testInfo.fail(defect !== undefined, defect?.description);
        },
        { auto: true },
    ],
});

/**
 * Details for a test of what the API *should* do, given a known defect in what it does today:
 *
 *     test('refuses invalid credentials with 401', knownDefect('Answers 200 OK.'), async ...)
 *
 * The `verdict` fixture then expects the test to fail: it stays green while the API misbehaves as
 * described, and turns red ("expected to fail, but passed") the day the API is fixed, so a fix is
 * noticed instead of silently absorbed. The defect is tagged `@known-defect` and described in both
 * the Playwright and the Allure report. Without a defect, it is an ordinary test.
 *
 * A 5xx is never a known defect: `verdict` fails the test on one regardless.
 *
 * An expected failure passes on *any* failure, so a test declared this way must assert one property
 * only. A property that holds today, sharing a test with one that does not, would go unchecked.
 *
 * Declared through test details rather than test.fail(), which also annotates the test with an empty
 * "fail" that the Allure report renders as a step titled "fail: undefined".
 */
export const knownDefect = (description?: string): TestDetails =>
    description === undefined
        ? {}
        : { tag: '@known-defect', annotation: { type: KNOWN_DEFECT, description } };

export { expect };
