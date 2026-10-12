/**
 * The app's React Native `Alert.alert(...)` dialogs.
 *
 * Not using WebdriverIO v10's `acceptDialog()`: it targets OS permission prompts (on iOS it
 * switches to SpringBoard) and silently succeeds when no dialog exists, which would hide failures.
 *
 * Android: webdriverio/appium-boilerplate uses `com.wdiodemoapp:id/alert_title` for the v2 (Expo)
 * build, but the v2.2.0 APK's resources contain both `alert_title` and `alertTitle`, so either is
 * accepted. The message is `android:id/message`; button labels are rendered in upper case.
 */
const ANDROID_TITLE_IDS = [
    'com.wdiodemoapp:id/alert_title',
    'com.wdiodemoapp:id/alertTitle',
    'android:id/alertTitle',
];

const SELECTORS = {
    ANDROID: {
        TITLE: `//android.widget.TextView[${ANDROID_TITLE_IDS.map((id) => `@resource-id="${id}"`).join(' or ')}]`,
        MESSAGE: '//android.widget.TextView[@resource-id="android:id/message"]',
        BUTTON: (text: string) => `//android.widget.Button[@text="${text.toUpperCase()}"]`,
    },
    IOS: {
        ALERT: "-ios predicate string:type == 'XCUIElementTypeAlert'",
        BUTTON: (text: string) => `~${text}`,
    },
} as const;

export interface AlertContent {
    title: string;
    message: string;
}

class NativeAlert {
    private get anchor(): ChainablePromiseElement {
        return $(driver.isAndroid ? SELECTORS.ANDROID.TITLE : SELECTORS.IOS.ALERT);
    }

    /** The login/sign-up form simulates a 1.5 s API call before alerting, so allow headroom. */
    async waitForIsShown(isShown = true, timeout = 10_000): Promise<void> {
        await this.anchor.waitForExist({ timeout, reverse: !isShown });
    }

    /**
     * Resolves true if an alert appears within `withinMs`. Used by negative tests to prove
     * no success alert follows a rejected submission (the app would show one after ~1.5 s).
     */
    async appearsWithin(withinMs: number): Promise<boolean> {
        try {
            await this.anchor.waitForExist({ timeout: withinMs });
            return true;
        } catch {
            return false;
        }
    }

    async content(): Promise<AlertContent> {
        if (driver.isAndroid) {
            return {
                title: await $(SELECTORS.ANDROID.TITLE).getText(),
                message: await $(SELECTORS.ANDROID.MESSAGE).getText(),
            };
        }
        // iOS exposes "Title\nMessage" as the alert text.
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
