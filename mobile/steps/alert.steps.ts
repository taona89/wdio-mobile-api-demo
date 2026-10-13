import { Then } from '@cucumber/cucumber';
import NativeAlertPage from '../pages/native-alert.page.js';
import { ALERTS, isAlertName } from '../data/messages.js';

/**
 * Alerts are asserted by name. Their copy is two-part (title and message), which reads badly
 * inline in a feature file, so data/messages.ts holds the pairs and this step resolves the name.
 */
Then('the {string} alert is shown', async (name: string) => {
    if (!isAlertName(name)) {
        throw new Error(
            `unknown alert "${name}". Known alerts: ${Object.keys(ALERTS).join(' | ')}. ` +
                'Add it to data/messages.ts.',
        );
    }

    await NativeAlertPage.waitForIsShown();
    expect(await NativeAlertPage.content()).toEqual(ALERTS[name]);
    // Dismiss as part of the assertion: it proves the alert is dismissable and leaves the screen
    // clean, which matters because the alert blocks every other element on Android.
    await NativeAlertPage.dismiss();
});

Then('no alert appears within {int} seconds', async (seconds: number) => {
    // A valid submission alerts after ~1.5 s, so a few seconds without one proves it was rejected.
    expect(await NativeAlertPage.appearsWithin(seconds * 1_000)).toBe(false);
});
