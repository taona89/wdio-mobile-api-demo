/**
 * Test data for the Login / Sign up form.
 *
 * The app has no backend. LoginForm.tsx only checks that the email matches its regex and the
 * password has at least 8 characters; any input that passes gets the success alert.
 */
export interface Credentials {
    email: string;
    password: string;
}

/** The app's only password rule. */
export const MIN_PASSWORD_LENGTH = 8;

/** Unique per call, so sign-up data never collides between runs. */
export const newUser = (): Credentials => ({
    email: `qa.user.${Date.now()}${Math.floor(Math.random() * 1_000)}@example.com`,
    password: 'Str0ngPass!',
});

/** Credentials that satisfy the form's rules; there is no stored account behind them. */
export const validUser: Credentials = {
    email: 'qa.login@example.com',
    password: 'Str0ngPass!',
};

/** Boundary values around the 8-character rule. */
export const PASSWORDS = {
    oneTooShort: 'a'.repeat(MIN_PASSWORD_LENGTH - 1),
    exactlyMinimum: 'Wrong123',
} as const;
