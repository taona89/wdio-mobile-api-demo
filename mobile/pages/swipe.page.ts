import AppPage from './app.page.js';
import TabBarPage from './tab-bar.page.js';
import { byId, byText } from '../support/selectors.js';
import { swipeLeftAcross, type Box } from '../support/gestures.js';

/**
 * Swipe tab (src/screens/Swipe.tsx): a horizontal, non-looping carousel of six cards, with a
 * logo hidden below the fold.
 *
 * SliderEntry labels every card `card`, so the cards cannot be told apart by accessibility id.
 * Their titles are the only per-card signal, and SliderEntry renders them as `title.toUpperCase()`,
 * hence the upper-case constants here.
 */
export const CARD_TITLES = [
    'FULLY OPEN SOURCE',
    'GREAT COMMUNITY',
    'JS.FOUNDATION',
    'SUPPORT VIDEOS',
    'EXTENDABLE',
    'COMPATIBLE',
] as const;

/**
 * The reward copy below the fold (src/screens/Swipe.tsx). No id of its own, so it is located by
 * text like the card titles. It is the last element on the screen, below the logo, which is why
 * scrolling stops here rather than at the logo.
 */
export const HIDDEN_MESSAGE = 'You found me!!!';

export const HIDDEN_TEXTS = [HIDDEN_MESSAGE] as const;

class SwipePage extends AppPage {
    constructor() {
        super('Swipe-screen');
    }

    /** Every rendered carousel card. The carousel mounts only the cards near the viewport. */
    private get cards() {
        return $$(byId('card'));
    }

    /** Hidden below the fold until the screen is scrolled. */
    get logo(): ChainablePromiseElement {
        return $(byId('WebdriverIO logo'));
    }

    async open(): Promise<void> {
        await TabBarPage.waitForIsShown();
        await TabBarPage.open('Swipe');
        await this.waitForIsShown();
    }

    cardTitle(title: string): ChainablePromiseElement {
        return $(byText(title));
    }

    hiddenText(text: string): ChainablePromiseElement {
        return $(byText(text));
    }

    async swipeCarouselLeft(): Promise<void> {
        await swipeLeftAcross(await this.carouselBox());
    }

    /**
     * Scroll to the bottom of the screen, which is ~600dp below the carousel. Scrolling this
     * screen's own container is the only thing that works here - see AppPage.scrollTo for why a
     * coordinate swipe does not. The target is the message rather than the logo because the
     * message is below it, so reaching the message guarantees both have been passed.
     */
    async scrollToHiddenMessage(): Promise<void> {
        await this.scrollTo(this.hiddenText(HIDDEN_MESSAGE), 15);
    }

    /**
     * The first rendered card's box. The gesture has to start inside the carousel: a swipe that
     * begins anywhere else is handled by the surrounding ScrollView and scrolls the page instead.
     */
    private async carouselBox(): Promise<Box> {
        const [first] = await this.cards;
        if (!first) {
            throw new Error('no carousel card (~card) found on the Swipe screen');
        }
        const { x, y } = await first.getLocation();
        const { width, height } = await first.getSize();
        return { x, y, width, height };
    }
}

export default new SwipePage();
