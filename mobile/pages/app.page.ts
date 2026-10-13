import { byId } from '../support/selectors.js';

/**
 * Base for all page objects. Every screen in the app's root view carries a `<Name>-screen`
 * accessibility id, which is the reliable signal that the screen has finished rendering.
 */
export default abstract class AppPage {
    protected constructor(private readonly screenId: string) {}

    /** The screen's root element, which is also its scroll container. */
    get root(): ChainablePromiseElement {
        return $(byId(this.screenId));
    }

    async waitForIsShown(isShown = true): Promise<void> {
        await this.root.waitForDisplayed({ reverse: !isShown });
    }

    /**
     * Bring an element below the fold into view by scrolling *this screen's* container.
     *
     * This drives the scrollable element itself (Appium's scroll gesture) rather than synthesising
     * a drag at screen coordinates. That distinction matters: a child that handles its own
     * gestures - the Swipe screen's carousel, which fills most of the viewport - swallows a
     * coordinate drag that begins inside it, and the page then does not scroll at all.
     *
     * `maxScrolls` defaults to WebdriverIO's 10; raise it for content a long way down.
     */
    protected async scrollTo(element: ChainablePromiseElement, maxScrolls?: number): Promise<void> {
        await element.scrollIntoView({
            scrollableElement: await this.root,
            ...(maxScrolls === undefined ? {} : { maxScrolls }),
        });
    }
}
