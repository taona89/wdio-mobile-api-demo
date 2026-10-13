import { When } from '@cucumber/cucumber';
import LoginPage from '../pages/login.page.js';
import { newUser } from '../data/users.js';

When('I sign up with a new account', async () => {
    await LoginPage.signUp(newUser());
});

When('I sign up with a new account but confirm a different password', async () => {
    const user = newUser();
    await LoginPage.signUp(user, `${user.password}-different`);
});
