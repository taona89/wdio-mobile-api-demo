/**
 * Cross-platform element recognition.
 *
 * Every page object locates elements through `byId()`, which is the accessibility id. The app's
 * `testProperties()` helper (src/config/TestProperties.ts, v2.2.0) sets the *same* string as
 * `accessibilityLabel` on Android and `testID` on iOS:
 *
 *     IS_IOS ? { testID: id } : { accessibilityLabel: id }
 *
 * Appium maps both to the accessibility id, so `~id` resolves identically on UiAutomator2 and
 * XCUITest, and every element the app itself renders is found the same way on both platforms.
 *
 * `byText()` is the documented exception, used only where the app exposes no usable id. See
 * `byText`'s own note for every place that applies and why.
 *
 * Two page objects do still branch on platform, and neither is an element the app controls:
 * `tab-bar.page.ts` scopes the iOS lookup to a button because the accessibility id collides with
 * the Login form's own "Login" text, and `native-alert.page.ts` targets a dialog the platform
 * draws rather than the app. Both are documented at their definitions.
 */

/** Accessibility-id selector. The one locator strategy page objects should use. */
export const byId = (id: string): string => `~${id}`;

const escapeQuoted = (text: string): string => text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Exact visible-text selector, using each platform's native locator strategy.
 *
 * Only for elements the app gives no usable id:
 *   1. Form validation messages. They are the `errorMessage` prop of react-native-elements'
 *      `Input` (src/components/LoginForm.tsx), which renders its own Text with no testID or
 *      accessibilityLabel, so there is nothing to target but the copy.
 *   2. Carousel card titles, and the copy hidden below the fold on the Swipe screen.
 *      `SliderEntry` labels every card `card`, so the six cards are indistinguishable by id; the
 *      title is the only per-card signal.
 *   3. The Login form's heading, which `login.page.ts` taps to dismiss the keyboard on iOS. It is
 *      never asserted on - it just needs to be an inert, non-input place to tap.
 *
 * All of these are still platform-aware, so they run on Android and iOS unchanged. Every string
 * asserted through byText is checked against the app's known copy first, so a typo fails fast
 * rather than waiting out the locator timeout.
 */
export const byText = (text: string): string =>
    driver.isAndroid
        ? `android=new UiSelector().text("${escapeQuoted(text)}")`
        : // React Native renders a Text as two nested StaticTexts with the same label on iOS, and
          // only the inner one is an accessibility element. Without the `accessible` clause every
          // text matches twice, which WebdriverIO 10's strict selectors reject.
          `-ios predicate string:label == "${escapeQuoted(text)}" AND accessible == true`;
