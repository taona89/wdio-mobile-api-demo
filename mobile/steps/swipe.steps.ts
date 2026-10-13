import { Then, When } from '@cucumber/cucumber';
import SwipePage, { CARD_TITLES, HIDDEN_TEXTS } from '../pages/swipe.page.js';

/**
 * Copy that is not in the app can never appear, so checking it up front turns a typo in a feature
 * file into an immediate error instead of a wait-out-the-timeout "not displayed".
 */
const assertKnownCopy = (text: string, known: readonly string[], kind: string): void => {
    if (!known.includes(text)) {
        throw new Error(`"${text}" is not ${kind}, so it can never appear. Known: ${known.join(' | ')}`);
    }
};

When('I swipe the carousel left', async () => {
    await SwipePage.swipeCarouselLeft();
});

When('I scroll down to the hidden message', async () => {
    await SwipePage.scrollToHiddenMessage();
});

Then('the carousel shows {string}', async (title: string) => {
    assertKnownCopy(title, CARD_TITLES, 'a carousel card title');
    await expect(SwipePage.cardTitle(title)).toBeDisplayed();
});

Then('the carousel no longer shows {string}', async (title: string) => {
    assertKnownCopy(title, CARD_TITLES, 'a carousel card title');
    await expect(SwipePage.cardTitle(title)).not.toBeDisplayed();
});

Then('the WebdriverIO logo is not displayed', async () => {
    await expect(SwipePage.logo).not.toBeDisplayed();
});

Then('I see the text {string}', async (text: string) => {
    assertKnownCopy(text, HIDDEN_TEXTS, 'copy the Swipe screen hides below the fold');
    await expect(SwipePage.hiddenText(text)).toBeDisplayed();
});
