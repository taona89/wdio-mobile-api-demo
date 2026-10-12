/**
 * The app's React Native `Alert.alert(...)` dialogs.
 *
 * WebdriverIO 10's `acceptDialog()` is not used here. On iOS it switches to SpringBoard (it is
 * built for system permission prompts), and on both platforms it returns silently when no dialog
 * is present. These tests need to assert that a specific alert appeared, with specific text.
 */
const SELECTORS = {
    ANDROID: {
        // With the app's AppCompat theme, React Native's AlertFragment renders its own title view
        // with this id (confirmed in the v2.2.0 APK and in webdriverio/appium-boilerplate).
        TITLE: '//android.widget.TextView[@resource-id="com.wdiodemoapp:id/alert_title"]',
        MESSAGE: '//android.widget.TextView[@resource-id="android:id/message"]',
        // Material buttons may render their label in upper case, so accept either form.
        BUTTON: (text: string) => `//android.widget.Button[@text="${text}" or @text="${text.toUpperCase()}"]`,
    },
    IOS: {
        ALERT: "-ios predicate string:type == 'XCUIElementTypeAlert'",
        BUTTON: (text: string) => `~${text}`,
    },
} as const;

/** waitUntil reports a timeout with exactly this message; any other error is a real failure. */
const NOT_SHOWN = 'native alert did not appear';

export interface AlertContent {
    title: string;
    message: string;
}

class NativeAlert {
    private get anchor(): ChainablePromiseElement {
        return $(driver.isAndroid ? SELECTORS.ANDROID.TITLE : SELECTORS.IOS.ALERT);
    }

    /** The login form fakes a 1.5 s API call before alerting, so the default leaves headroom. */
    async waitForIsShown(isShown = true, timeout = 10_000): Promise<void> {
        await this.anchor.waitForExist({ timeout, reverse: !isShown });
    }

    /**
     * For negative tests: true if an alert appears within `withinMs`, false if it does not.
     * Only the wait's own timeout means "no alert". Any other error (lost session, bad selector,
     * strict-selector violation) is rethrown, so a broken driver can never pass a negative test.
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
        // iOS (to be confirmed when iOS is added): WebDriverAgent returns "Title\nMessage".
        const [title = '', ...rest] = (await driver.getAlertText()).split('\n');
        return { title, message: rest.join('\n') };
    }

    async tapButton(text: string): Promise<void> {
        const selector = driver.isAndroid ? SELECTORS.ANDROID.BUTTON(text) : SELECTORS.IOS.BUTTON(text);
        await $(selector).click();
    }

    async dismiss(): Promise<void> {
        await this.tapButton('OK');
        await this.waitForIsShown(false);
    }
}

export default new NativeAlert();
