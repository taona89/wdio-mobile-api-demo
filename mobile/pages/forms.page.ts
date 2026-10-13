import AppPage from './app.page.js';
import TabBarPage from './tab-bar.page.js';
import { byId } from '../support/selectors.js';
import { hideKeyboard } from '../support/keyboard.js';

export type FormButton = 'Active' | 'Inactive';

/**
 * Forms tab (src/components/FormComponents.tsx).
 *
 * Every control here carries an accessibility id, so this page needs no platform branch at all.
 * The dropdown (`~Dropdown`) is deliberately left out: RNPickerSelect is configured with
 * `useNativeAndroidPickerStyle={false}`, so Android renders a modal list while iOS renders a
 * picker wheel with a Done button. Driving both needs two genuinely different interactions and
 * there is no iOS device here to verify the second against. See README, "Requirement coverage".
 *
 * The two elements scenarios assert on are exposed as getters rather than wrapped in methods
 * returning strings, so steps can use expect-webdriverio's retrying matchers (`toHaveText`)
 * instead of reading a value once and racing the re-render.
 */
class FormsPage extends AppPage {
    constructor() {
        super('Forms-screen');
    }

    /** Echoes whatever has been typed; sits directly under the input. */
    get typedResult(): ChainablePromiseElement {
        return $(byId('input-text-result'));
    }

    /** Reads "Click to turn the switch ON" or "... OFF", so it reports the switch's state. */
    get switchLabel(): ChainablePromiseElement {
        return $(byId('switch-text'));
    }

    private get textInput() {
        return $(byId('text-input'));
    }
    private get toggle() {
        return $(byId('switch'));
    }
    private button(label: FormButton) {
        // The app's Button component ids itself `button-${testID || text}`.
        return $(byId(`button-${label}`));
    }

    async open(): Promise<void> {
        await TabBarPage.waitForIsShown();
        await TabBarPage.open('Forms');
        await this.waitForIsShown();
    }

    async type(text: string): Promise<void> {
        await this.textInput.setValue(text);
        // The keyboard covers the result Text on a phone, and a covered element is not displayed.
        // switchLabel is a plain Text, so tapping it to dismiss the keyboard on iOS is inert.
        await hideKeyboard(this.switchLabel);
    }

    async toggleSwitch(): Promise<void> {
        await this.scrollTo(this.toggle);
        await this.toggle.click();
    }

    async tap(label: FormButton): Promise<void> {
        const button = this.button(label);
        // Both buttons sit at the bottom of a form taller than most phone screens.
        await this.scrollTo(button);
        await button.click();
    }
}

export default new FormsPage();
