/**
 * Test data for the Login / Sign up form.
 *
 * The demo app has no backend: it accepts any email matching its regex and any
 * password of 8+ characters (verified in src/components/LoginForm.tsx of the app).
 * Unique emails per run still matter so the tests stay valid if a backend is added.
 */
export interface Credentials {
    email: string;
    password: string;
}

const uniqueSuffix = (): string => `${Date.now()}${Math.floor(Math.random() * 1_000)}`;

export const newUser = (): Credentials => ({
    email: `qa.user.${uniqueSuffix()}@example.com`,
    password: 'Str0ngPass!',
});

export const existingUser: Credentials = {
    email: 'existing.user@example.com',
    password: 'Str0ngPass!',
};

/** Exact messages rendered by the app; asserting full strings catches copy regressions. */
export const MESSAGES = {
    loginSuccess: { title: 'Success', message: 'You are logged in!' },
    signupSuccess: { title: 'Signed Up!', message: 'You successfully signed up!' },
    invalidEmail: 'Please enter a valid email address',
    shortPassword: 'Please enter at least 8 characters',
    passwordMismatch: 'Please enter the same password',
} as const;
