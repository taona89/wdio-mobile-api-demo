import NativeAlert from '../src/screens/components/NativeAlert.js';
import LoginScreen from '../src/screens/LoginScreen.js';
import { restartApp } from '../src/helpers/app.js';
import { newUser } from '../src/data/users.js';
import { MESSAGES } from '../src/data/messages.js';

describe('Sign up', () => {
    beforeEach(async () => {
        await restartApp();
        await LoginScreen.open('signup');
    });

    it('creates a new account with valid details', async () => {
        await LoginScreen.signUp(newUser());

        await NativeAlert.waitForIsShown();
        expect(await NativeAlert.content()).toEqual(MESSAGES.signupSuccess);
        await NativeAlert.dismiss();
    });

    it('rejects sign up when the confirmation password does not match', async () => {
        const user = newUser();
        await LoginScreen.signUp(user, `${user.password}-different`);

        await expect(LoginScreen.validationMessage(MESSAGES.passwordMismatch)).toBeDisplayed();
        // A valid submission alerts after ~1.5 s, so 3 s without one proves it was rejected.
        expect(await NativeAlert.appearsWithin(3_000)).toBe(false);
    });
});
