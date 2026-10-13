/**
 * The app's React Native `Alert.alert(...)` dialogs.
 *
 * This is the one page object that cannot use accessibility ids, and the reason is not a gap in
 * the test code: `Alert.alert` is drawn by the platform, not by the app, so there is no React
 * component for the app to put a `testID` on. Android gives an AppCompat AlertDialog whose title
 * and message views have fixed framework resource-ids; iOS gives an XCUIElementTypeAlert reachable
 * through XCUITest's own alert API. Both are stable, documented platform contracts.
 *
 * WebdriverIO 10's `acceptDialog()` is not used: on iOS it switches to SpringBoard (it is built
 * for system permission prompts), and on both platforms it returns silently when no dialog is
 * present. These scenarios need to assert that a specific alert appeared, with specific text.
 */
const SELECTORS = {
    ANDROID: {
        // React Native's AlertFragment renders its own title view with this id under the app's
        // AppCompat theme. This asymmetric pair (app resource-id for the title, framework id for
        // the message) is the one webdriverio/appium-boilerplate uses.
        TITLE: '//android.widget.TextView[@resource-id="com.wdiodemoapp:id/alert_title"]',
        MESSAGE: '//android.widget.TextView[@resource-id="android:id/message"]',
        // Material buttons may render their label in upper case, so accept either form.
        BUTTON: (text: string) => `//android.widget.Button[@text="${text}" or @text="${text.toUpperCase()}"]`,
    },
    IOS: {
        ALERT: "-ios predicate string:type == 'XCUIElementTypeAlert'",
        // Scoped to a button, not `~text`: WebDriverAgent matches an accessibility id against both
        // name and label, so a bare `~OK` can also match the button's own StaticText child and
        // trip WebdriverIO 10's strict selectors. WebdriverIO's own acceptDialog() sidesteps the
        // same hazard by passing `{ strict: false }`.
        BUTTON: (text: string) =>
            `-ios predicate string:name == "${text}" AND type == "XCUIElementTypeButton"`,
    },
} as const;

/** waitUntil reports a timeout with exactly this message; any other error is a real failure. */
const NOT_SHOWN = 'native alert did not appear';

export interface AlertContent {
    title: string;
    message: string;
}

class NativeAlertPage {
    private get anchor(): ChainablePromiseElement {
        return $(driver.isAndroid ? SELECTORS.ANDROID.TITLE : SELECTORS.IOS.ALERT);
    }

    /** The login form fakes a 1.5 s API call before alerting, so the default leaves headroom. */
    async waitForIsShown(isShown = true, timeout = 10_000): Promise<void> {
        await this.anchor.waitForExist({ timeout, reverse: !isShown });
    }

    /**
     * For negative scenarios: true if an alert appears within `withinMs`, false if it does not.
     * Only the wait's own timeout means "no alert". Any other error (lost session, bad selector,
     * strict-selector violation) is rethrown, so a broken driver can never pass a negative check.
     */
    async appearsWithin(withinMs: number): Promise<boolean> {
        try {
            await browser.waitUntil(() => this.anchor.isExisting(), {
                timeout: withinMs,
                timeoutMsg: NOT_SHOWN,
            });
            return true;
        } catch (error) {
            if (error instanceof Error && error.message === NOT_SHOWN) return false;
            throw error;
        }
    }

    async content(): Promise<AlertContent> {
        if (driver.isAndroid) {
            return {
                title: await $(SELECTORS.ANDROID.TITLE).getText(),
                message: await $(SELECTORS.ANDROID.MESSAGE).getText(),
            };
        }
        // iOS: WebDriverAgent returns "Title\nMessage".
        const [title = '', ...rest] = (await driver.getAlertText()).split('\n');
        return { title, message: rest.join('\n') };
    }

    async tapButton(text: string): Promise<void> {
        const selector = driver.isAndroid ? SELECTORS.ANDROID.BUTTON(text) : SELECTORS.IOS.BUTTON(text);
        await $(selector).click();
    }

    /** Every alert in the app offers OK, including the three-button one on the Forms screen. */
    async dismiss(): Promise<void> {
        await this.tapButton('OK');
        await this.waitForIsShown(false);
    }
}

export default new NativeAlertPage();
