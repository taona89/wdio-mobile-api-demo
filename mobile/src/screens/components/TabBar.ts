/**
 * Bottom tab bar (src/components/CustomBottomTabBar.tsx).
 *
 * Each tab's accessibility label is its `tabBarAccessibilityLabel` from app/(tabs)/_layout.tsx.
 * That usually equals the visible title, with one exception for Day 2: the "Data" tab is
 * labelled "Data management". Webview, Login, Forms, Swipe and Drag are pinned to the bar by
 * default; Permissions and Data are reached through the Menu tab.
 */
type TabLabel = 'Home' | 'Webview' | 'Login' | 'Forms' | 'Swipe' | 'Drag' | 'Menu';

class TabBar {
    private tab(label: TabLabel): ChainablePromiseElement {
        // Android: `~` matches content-desc, which only the tab carries. iOS: the Login form's
        // button also exposes a "Login" text element, so scope to buttons to keep the match unique
        // under WebdriverIO 10's strict selectors. (iOS path to be confirmed when iOS is added.)
        return $(
            driver.isAndroid
                ? `~${label}`
                : `-ios predicate string:name == "${label}" AND type == "XCUIElementTypeButton"`,
        );
    }

    /** 30 s rather than the 15 s default: covers the splash screen on a cold start. */
    async waitForIsShown(): Promise<void> {
        await this.tab('Home').waitForDisplayed({ timeout: 30_000 });
    }

    async open(label: TabLabel): Promise<void> {
        await this.tab(label).click();
    }
}

export default new TabBar();
