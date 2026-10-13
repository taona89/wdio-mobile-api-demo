import { Given } from '@cucumber/cucumber';
import FormsPage from '../pages/forms.page.js';
import LoginPage from '../pages/login.page.js';
import SwipePage from '../pages/swipe.page.js';

/**
 * Navigation steps. The app is relaunched before every scenario by the Before hook in
 * support/hooks.ts, so each of these starts from Home and the order of scenarios never matters.
 */

Given(/^I am on the (login|sign up) form$/, async (mode: string) => {
    await LoginPage.open(mode === 'login' ? 'login' : 'signup');
});

Given('I am on the Forms screen', async () => {
    await FormsPage.open();
});

Given('I am on the Swipe screen', async () => {
    await SwipePage.open();
});
