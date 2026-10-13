/**
 * The app's exact UI copy (v2.2.0). Asserting whole strings means a copy change fails a scenario
 * instead of passing silently.
 *
 * Alerts are two-part (title + message), so feature files name them and these pairs resolve the
 * name. Single-line copy, such as a validation message, is written in the feature file itself,
 * where it belongs as part of the specification; `isKnownValidationMessage` below guards against
 * a typo there turning into a slow timeout.
 */
export const ALERTS = {
    /** src/components/LoginForm.tsx */
    'login success': { title: 'Success', message: 'You are logged in!' },
    'sign up success': { title: 'Signed Up!', message: 'You successfully signed up!' },
    /** src/components/FormComponents.tsx, raised by the Active button */
    'active button': { title: 'This button is', message: 'This button is active' },
} as const;

export type AlertName = keyof typeof ALERTS;

export const isAlertName = (name: string): name is AlertName => name in ALERTS;

/** src/components/LoginForm.tsx, passed to each Input as its `errorMessage` prop. */
export const VALIDATION_MESSAGES = [
    'Please enter a valid email address',
    'Please enter at least 8 characters',
    'Please enter the same password',
] as const;

/**
 * A validation message that is not in the app's copy can never appear, so a misspelling in a
 * feature file would otherwise wait out the full locator timeout and then fail with "not
 * displayed". Checking the text up front turns that into an immediate, obvious error.
 */
export const isKnownValidationMessage = (text: string): boolean =>
    (VALIDATION_MESSAGES as readonly string[]).includes(text);
