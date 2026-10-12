import AppScreen from './AppScreen.js';
import TabBar from './components/TabBar.js';
import { byId, byText } from '../helpers/selectors.js';
import type { Credentials } from '../data/users.js';

export type LoginMode = 'login' | 'signup';

/**
 * Login / Sign up form (src/components/LoginForm.tsx).
 * Button ids follow the app's Button component rule: `button-${testID || text}`.
 */
class LoginScreen extends AppScreen {
    constructor() {
        super('Login-screen');
    }

    private get loginModeTab() {
        return $(byId('button-login-container'));
    }
    private get signUpModeTab() {
        return $(byId('button-sign-up-container'));
    }
    private get emailInput() {
        return $(byId('input-email'));
    }
    private get passwordInput() {
        return $(byId('input-password'));
    }
    /** Only rendered in sign-up mode, which makes it the signal for which mode is active. */
    private get repeatPasswordInput() {
        return $(byId('input-repeat-password'));
    }
    private get loginButton() {
        return $(byId('button-LOGIN'));
    }
    private get signUpButton() {
        return $(byId('button-SIGN UP'));
    }

    /** Navigate from anywhere in the app to the form, in the requested mode. */
    async open(mode: LoginMode): Promise<void> {
        await TabBar.waitForIsShown();
        await TabBar.open('Login');
        await this.waitForIsShown();
        // Login is the default mode, but select it explicitly so the test never depends on that.
        if (mode === 'login') {
            await this.loginModeTab.click();
            await this.repeatPasswordInput.waitForExist({ reverse: true });
        } else {
            await this.signUpModeTab.click();
            await this.repeatPasswordInput.waitForDisplayed();
        }
    }

    async login({ email, password }: Credentials): Promise<void> {
        await this.emailInput.setValue(email);
        await this.passwordInput.setValue(password);
        await this.submit(this.loginButton);
    }

    async signUp({ email, password }: Credentials, repeatPassword = password): Promise<void> {
        await this.emailInput.setValue(email);
        await this.passwordInput.setValue(password);
        await this.repeatPasswordInput.setValue(repeatPassword);
        await this.submit(this.signUpButton);
    }

    /** Validation messages have no id; each is rendered once, under its own input. */
    validationMessage(text: string): ChainablePromiseElement {
        return $(byText(text));
    }

    private async submit(button: ChainablePromiseElement): Promise<void> {
        await this.hideKeyboard();
        // On small screens the button can sit below the fold after the keyboard has been open.
        await button.scrollIntoView({ scrollableElement: await this.screen });
        await button.click();
    }

    /**
     * Hiding the keyboard resizes the layout (adjustResize, KeyboardAvoidingView, and the tab bar
     * reappearing), so wait until it has really gone before locating the submit button.
     */
    private async hideKeyboard(): Promise<void> {
        if (!(await driver.isKeyboardShown())) return;
        if (driver.isAndroid) {
            await driver.hideKeyboard();
        } else {
            // driver.hideKeyboard() is unreliable on iOS (an XCTest limitation), so tap the form's
            // heading: a non-interactive element, unlike the screen centre, which may be an input.
            await $(byText('Login / Sign up Form')).click();
        }
        await browser.waitUntil(async () => !(await driver.isKeyboardShown()), {
            timeout: 5_000,
            timeoutMsg: 'keyboard is still shown 5 s after trying to hide it',
        });
    }
}

export default new LoginScreen();
