import { byId } from '../helpers/selectors.js';

/** Base class: every screen in the demo app exposes a `<Name>-screen` accessibility id. */
export default abstract class AppScreen {
    protected constructor(private readonly screenId: string) {}

    get screen(): ChainablePromiseElement {
        return $(byId(this.screenId));
    }

    async waitForIsShown(isShown = true): Promise<void> {
        await this.screen.waitForDisplayed({ reverse: !isShown });
    }
}
