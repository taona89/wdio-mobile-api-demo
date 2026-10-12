/**
 * Cross-platform selector helpers.
 *
 * The demo app sets `accessibilityLabel` on Android and `testID` on iOS from the same
 * string (see src/config/TestProperties.ts in the app), so `~id` works on both platforms.
 * Elements without an id (for example validation messages) are located by their visible text.
 */

/** Accessibility-id selector, identical on Android and iOS. */
export const byId = (id: string): string => `~${id}`;

/** Exact visible-text selector using each platform's native locator strategy. */
export const byText = (text: string): string => {
    const escaped = text.replace(/"/g, '\\"');
    return driver.isAndroid
        ? `android=new UiSelector().text("${escaped}")`
        : `-ios predicate string:label == "${escaped}"`;
};
