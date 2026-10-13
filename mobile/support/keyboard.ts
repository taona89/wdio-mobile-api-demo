/**
 * Dismissing the soft keyboard resizes the layout (adjustResize, KeyboardAvoidingView, and the
 * tab bar reappearing), so callers must wait until it has really gone before locating anything
 * near the bottom of the screen.
 *
 * `iosDismissTarget` is tapped on iOS only: driver.hideKeyboard() is unreliable there (an XCTest
 * limitation). Pass a non-interactive element, never the screen centre, which may be an input.
 * A screen with no such element passes nothing, and the keyboard is then left up on iOS.
 */
export async function hideKeyboard(iosDismissTarget?: ChainablePromiseElement): Promise<void> {
    if (!(await driver.isKeyboardShown())) return;

    if (driver.isAndroid) {
        await driver.hideKeyboard();
    } else if (iosDismissTarget) {
        await iosDismissTarget.click();
    } else {
        return;
    }

    await browser.waitUntil(async () => !(await driver.isKeyboardShown()), {
        timeout: 5_000,
        timeoutMsg: 'keyboard is still shown 5 s after trying to hide it',
    });
}
