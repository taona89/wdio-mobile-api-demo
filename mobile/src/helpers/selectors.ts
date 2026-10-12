/**
 * Cross-platform selector helpers.
 *
 * The app's testProperties() helper (src/config/TestProperties.ts) sets the same string as
 * `accessibilityLabel` on Android and `testID` on iOS, so `~id` targets both platforms.
 * Elements without an id, such as validation messages, are located by their visible text.
 */

/** Accessibility-id selector, identical on Android and iOS. */
export const byId = (id: string): string => `~${id}`;

const escapeQuoted = (text: string): string => text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** Exact visible-text selector using each platform's native locator strategy. */
export const byText = (text: string): string =>
    driver.isAndroid
        ? `android=new UiSelector().text("${escapeQuoted(text)}")`
        : `-ios predicate string:label == "${escapeQuoted(text)}"`;
