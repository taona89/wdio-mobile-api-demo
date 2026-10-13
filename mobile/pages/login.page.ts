import AppPage from './app.page.js';
import TabBarPage from './tab-bar.page.js';
import { byId, byText } from '../support/selectors.js';
import { hideKeyboard } from '../support/keyboard.js';
import type { Credentials } from '../data/users.js';

export type LoginMode = 'login' | 'signup';

/**
 * Login / Sign up form (src/components/LoginForm.tsx).
 * Button ids follow the app's Button component rule: `button-${testID || text}`.
 */
class LoginPage extends AppPage {
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
    /** The form's heading. No id, so text — but it is only ever tapped, never asserted on. */
    private get heading() {
        return $(byText('Login / Sign up Form'));
    }

    /** Navigate from anywhere in the app to the form, in the requested mode. */
    async open(mode: LoginMode): Promise<void> {
        await TabBarPage.waitForIsShown();
        await TabBarPage.open('Login');
        await this.waitForIsShown();
        // Login is the default mode, but select it explicitly so no scenario depends on that.
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

    /**
     * Validation messages have no id of their own: they are the `errorMessage` prop of
     * react-native-elements' Input, which renders its own Text. See support/selectors.ts.
     */
    validationMessage(text: string): ChainablePromiseElement {
        return $(byText(text));
    }

    private async submit(button: ChainablePromiseElement): Promise<void> {
        await hideKeyboard(this.heading);
        // On small screens the button can sit below the fold after the keyboard has been open.
        await this.scrollTo(button);
        await button.click();
    }
}

export default new LoginPage();
