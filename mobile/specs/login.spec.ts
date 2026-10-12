import TabBar from '../src/screens/components/TabBar.js';
import NativeAlert from '../src/screens/components/NativeAlert.js';
import LoginScreen from '../src/screens/LoginScreen.js';
import { restartApp } from '../src/helpers/app.js';
import { MESSAGES, existingUser } from '../src/data/users.js';

describe('Login', () => {
    beforeEach(async () => {
        await restartApp();
        await TabBar.waitForShown();
        await TabBar.openLogin();
        await LoginScreen.waitForIsShown();
        await LoginScreen.switchToLogin();
    });

    it('logs in with valid credentials', async () => {
        await LoginScreen.login(existingUser);

        await NativeAlert.waitForIsShown();
        await expect(await NativeAlert.content()).toEqual(MESSAGES.loginSuccess);
        await NativeAlert.dismiss();
    });

    /**
     * The demo app has no backend, so a "wrong" password can only be one that fails the
     * client-side rule (8+ characters). See README > Assumptions.
     */
    describe('with invalid credentials', () => {
        it('shows an error for a password shorter than 8 characters', async () => {
            await LoginScreen.login({ email: existingUser.email, password: 'short' });

            await expect(LoginScreen.validationMessage(MESSAGES.shortPassword)).toBeDisplayed();
            await expect(await NativeAlert.appearsWithin(3_000)).toBe(false);
        });

        it('shows an error for a malformed email address', async () => {
            await LoginScreen.login({ email: 'not-an-email', password: existingUser.password });

            await expect(LoginScreen.validationMessage(MESSAGES.invalidEmail)).toBeDisplayed();
            await expect(await NativeAlert.appearsWithin(3_000)).toBe(false);
        });
    });
});
