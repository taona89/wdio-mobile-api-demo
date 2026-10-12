import { byId } from '../../helpers/selectors.js';

/**
 * Bottom tab bar. Each tab's accessibility label is its title
 * (src/components/CustomBottomTabBar.tsx). Login, Forms, Swipe and Drag are pinned by
 * default; Permissions and Data are only reachable via the Menu tab.
 */
class TabBar {
    private tab(name: string): ChainablePromiseElement {
        return $(byId(name));
    }

    async waitForShown(): Promise<void> {
        await this.tab('Home').waitForDisplayed({ timeout: 30_000 });
    }

    async openLogin(): Promise<void> {
        await this.tab('Login').click();
    }

    async openForms(): Promise<void> {
        await this.tab('Forms').click();
    }

    async openSwipe(): Promise<void> {
        await this.tab('Swipe').click();
    }

    async openMenu(): Promise<void> {
        await this.tab('Menu').click();
    }
}

export default new TabBar();
