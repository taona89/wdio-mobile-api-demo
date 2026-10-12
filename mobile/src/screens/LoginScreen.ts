import AppScreen from './AppScreen.js';
import { byId, byText } from '../helpers/selectors.js';
import type { Credentials } from '../data/users.js';

/** Login / Sign up form (src/components/LoginForm.tsx in the app). */
class LoginScreen extends AppScreen {
    constructor() {
        super('Login-screen');
    }

    private get loginTab() {
        return $(byId('button-login-container'));
    }
    private get signUpTab() {
        return $(byId('button-sign-up-container'));
    }
    private get emailInput() {
        return $(byId('input-email'));
    }
    private get passwordInput() {
        return $(byId('input-password'));
    }
    private get repeatPasswordInput() {
        return $(byId('input-repeat-password'));
    }
    private get loginButton() {
        return $(byId('button-LOGIN'));
    }
    private get signUpButton() {
        return $(byId('button-SIGN UP'));
    }

    async switchToLogin(): Promise<void> {
        await this.loginTab.click();
        await this.repeatPasswordInput.waitForExist({ reverse: true });
    }

    async switchToSignUp(): Promise<void> {
        await this.signUpTab.click();
        await this.repeatPasswordInput.waitForDisplayed();
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

    /** Validation messages have no id, so they are located by their exact text. */
    validationMessage(text: string): ChainablePromiseElement {
        return $(byText(text));
    }

    private async submit(button: ChainablePromiseElement): Promise<void> {
        await this.hideKeyboard();
        // On small screens the button can sit below the fold once the keyboard has been open.
        await button.scrollIntoView({ scrollableElement: await this.screen });
        await button.click();
    }

    private async hideKeyboard(): Promise<void> {
        if (!(await driver.isKeyboardShown())) return;
        if (driver.isAndroid) {
            await driver.hideKeyboard();
        } else {
            // driver.hideKeyboard() is unreliable on iOS (XCTest limitation): tap a neutral area instead.
            await this.screen.click();
        }
    }
}

export default new LoginScreen();
