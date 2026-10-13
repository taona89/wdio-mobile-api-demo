import { byId } from '../support/selectors.js';

/**
 * Bottom tab bar (src/components/CustomBottomTabBar.tsx).
 *
 * Each tab's accessibility label is its `tabBarAccessibilityLabel` from app/(tabs)/_layout.tsx.
 * That equals the visible title except for the "Data" tab, which is labelled "Data management".
 * Webview, Login, Forms, Swipe and Drag are pinned to the bar; Permissions and Data sit behind Menu.
 */
export type TabLabel = 'Home' | 'Webview' | 'Login' | 'Forms' | 'Swipe' | 'Drag' | 'Menu';

class TabBarPage {
    private tab(label: TabLabel): ChainablePromiseElement {
        // Android: the accessibility id is unique to the tab. iOS also exposes the Login form's
        // own "Login" text as an accessibility element, so the id alone is ambiguous there under
        // WebdriverIO 10's strict selectors; scoping to a button keeps the match unique.
        return driver.isAndroid
            ? $(byId(label))
            : $(`-ios predicate string:name == "${label}" AND type == "XCUIElementTypeButton"`);
    }

    /** 30 s rather than the 15 s default: covers the splash screen on a cold start. */
    async waitForIsShown(): Promise<void> {
        await this.tab('Home').waitForDisplayed({ timeout: 30_000 });
    }

    async open(label: TabLabel): Promise<void> {
        await this.tab(label).click();
    }
}

export default new TabBarPage();
