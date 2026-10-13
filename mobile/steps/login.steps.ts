import { When } from '@cucumber/cucumber';
import LoginPage from '../pages/login.page.js';
import { validUser } from '../data/users.js';

When('I log in with valid credentials', async () => {
    await LoginPage.login(validUser);
});

When('I log in with email {string} and password {string}', async (email: string, password: string) => {
    await LoginPage.login({ email, password });
});
