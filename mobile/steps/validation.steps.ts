import { Then } from '@cucumber/cucumber';
import LoginPage from '../pages/login.page.js';
import { VALIDATION_MESSAGES, isKnownValidationMessage } from '../data/messages.js';

Then('I see the validation message {string}', async (message: string) => {
    // A message that is not in the app's copy can never appear, so without this check a typo in a
    // feature file would wait out the full locator timeout and then fail as "not displayed".
    if (!isKnownValidationMessage(message)) {
        throw new Error(
            `"${message}" is not one of the app's validation messages, so it can never appear. ` +
                `Known: ${VALIDATION_MESSAGES.join(' | ')}`,
        );
    }

    await expect(LoginPage.validationMessage(message)).toBeDisplayed();
});
