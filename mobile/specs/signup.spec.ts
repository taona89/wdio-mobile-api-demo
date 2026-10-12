import TabBar from '../src/screens/components/TabBar.js';
import NativeAlert from '../src/screens/components/NativeAlert.js';
import LoginScreen from '../src/screens/LoginScreen.js';
import { restartApp } from '../src/helpers/app.js';
import { MESSAGES, newUser } from '../src/data/users.js';

describe('Sign up', () => {
    beforeEach(async () => {
        await restartApp();
        await TabBar.waitForShown();
        await TabBar.openLogin();
        await LoginScreen.waitForIsShown();
        await LoginScreen.switchToSignUp();
    });

    it('creates a new account with valid details', async () => {
        await LoginScreen.signUp(newUser());

        await NativeAlert.waitForIsShown();
        await expect(await NativeAlert.content()).toEqual(MESSAGES.signupSuccess);
        await NativeAlert.dismiss();
    });

    it('rejects sign up when the passwords do not match', async () => {
        const user = newUser();
        await LoginScreen.signUp(user, `${user.password}-different`);

        await expect(LoginScreen.validationMessage(MESSAGES.passwordMismatch)).toBeDisplayed();
        await expect(await NativeAlert.appearsWithin(3_000)).toBe(false);
    });
});
