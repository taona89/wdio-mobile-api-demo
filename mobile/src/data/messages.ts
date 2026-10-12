/**
 * The app's exact UI copy, taken from src/components/LoginForm.tsx (v2.2.0).
 * Asserting whole strings means a copy change fails a test instead of passing silently.
 */
export const MESSAGES = {
    loginSuccess: { title: 'Success', message: 'You are logged in!' },
    signupSuccess: { title: 'Signed Up!', message: 'You successfully signed up!' },
    invalidEmail: 'Please enter a valid email address',
    passwordTooShort: 'Please enter at least 8 characters',
    passwordMismatch: 'Please enter the same password',
} as const;
