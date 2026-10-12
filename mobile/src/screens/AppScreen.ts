import { byId } from '../helpers/selectors.js';

/**
 * Base for all screen objects. Every screen in the app's root view carries a
 * `<Name>-screen` accessibility id, which is the reliable signal that the screen has rendered.
 */
export default abstract class AppScreen {
    protected constructor(private readonly screenId: string) {}

    get screen(): ChainablePromiseElement {
        return $(byId(this.screenId));
    }

    async waitForIsShown(isShown = true): Promise<void> {
        await this.screen.waitForDisplayed({ reverse: !isShown });
    }
}
