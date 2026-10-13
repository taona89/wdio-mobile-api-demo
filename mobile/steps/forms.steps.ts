import { Then, When } from '@cucumber/cucumber';
import FormsPage, { type FormButton } from '../pages/forms.page.js';

const FORM_BUTTONS: readonly FormButton[] = ['Active', 'Inactive'];

const asFormButton = (label: string): FormButton => {
    const match = FORM_BUTTONS.find((button) => button === label);
    if (!match) {
        throw new Error(`unknown Forms button "${label}". The screen has: ${FORM_BUTTONS.join(' | ')}`);
    }
    return match;
};

When('I type {string} into the input field', async (text: string) => {
    await FormsPage.type(text);
});

When('I toggle the switch', async () => {
    await FormsPage.toggleSwitch();
});

When('I tap the {string} button', async (label: string) => {
    await FormsPage.tap(asFormButton(label));
});

// toHaveText retries until the matcher passes, so these never race the component's re-render.
Then('the input field result reads {string}', async (text: string) => {
    await expect(FormsPage.typedResult).toHaveText(text);
});

Then('the switch label reads {string}', async (label: string) => {
    await expect(FormsPage.switchLabel).toHaveText(label);
});
