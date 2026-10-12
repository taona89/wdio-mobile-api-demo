import NativeAlert from '../src/screens/components/NativeAlert.js';
import LoginScreen from '../src/screens/LoginScreen.js';
import { restartApp } from '../src/helpers/app.js';
import { PASSWORDS, validUser } from '../src/data/users.js';
import { MESSAGES } from '../src/data/messages.js';

describe('Login', () => {
    beforeEach(async () => {
        await restartApp();
        await LoginScreen.open('login');
    });

    it('logs in with valid credentials', async () => {
        await LoginScreen.login(validUser);

        await NativeAlert.waitForIsShown();
        expect(await NativeAlert.content()).toEqual(MESSAGES.loginSuccess);
        await NativeAlert.dismiss();
    });

    /**
     * The app has no backend, so it can only reject a password that breaks its one rule
     * (8+ characters). These tests cover that rule at its boundary, and the last test records
     * what the app does with a well-formed wrong password. See README, "Requirement coverage".
     */
    describe('with invalid credentials', () => {
        it('rejects a wrong password one character below the minimum and shows an error', async () => {
            await LoginScreen.login({ email: validUser.email, password: PASSWORDS.oneTooShort });

            await expect(LoginScreen.validationMessage(MESSAGES.passwordTooShort)).toBeDisplayed();
            // A valid submission alerts after ~1.5 s, so 3 s without one proves it was rejected.
            expect(await NativeAlert.appearsWithin(3_000)).toBe(false);
        });

        it('rejects a malformed email address and shows an error', async () => {
            await LoginScreen.login({ email: 'not-an-email', password: validUser.password });

            await expect(LoginScreen.validationMessage(MESSAGES.invalidEmail)).toBeDisplayed();
            expect(await NativeAlert.appearsWithin(3_000)).toBe(false);
        });

        it('accepts any well-formed password, because the app has no credential check (finding)', async () => {
            // Characterisation test: exactly 8 characters and not the user's password, yet it logs in.
            // In a real team this goes to the product owner. It also covers the boundary's valid side.
            await LoginScreen.login({ email: validUser.email, password: PASSWORDS.exactlyMinimum });

            await NativeAlert.waitForIsShown();
            expect(await NativeAlert.content()).toEqual(MESSAGES.loginSuccess);
            await NativeAlert.dismiss();
        });
    });
});
