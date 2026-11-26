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

/** A swipe is sent at most this many times before the carousel counts as unresponsive. */
const SWIPE_ATTEMPTS = 3;

/**
 * How long a swipe gets to move the carousel before it counts as dropped. A dropped swipe moves
 * nothing at all, so this only has to outlast a slow device plus one lookup of a title that has
 * already left the screen, which can take 3 s on Android (`waitForSelectorTimeout`).
 */
const MOVE_TIMEOUT = 8_000;

/** waitUntil reports its own timeout with exactly this message; any other error is a real failure. */
const DID_NOT_MOVE = 'the carousel did not move';

interface CardPosition {
    title: string;
    x: number;
}

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

    /**
     * Swipe the carousel one card to the left, and check that the carousel took the swipe.
     *
     * A slow device can drop a swipe that arrives while the screen is still rendering: on the CI
     * emulator the Swipe screen draws a few frames a second for its first second, and a swipe sent
     * then is delivered but moves nothing. So the swipe is sent again, up to SWIPE_ATTEMPTS times,
     * but only while the leading card has not moved at all, so the carousel can never page twice.
     * Which card it lands on is still for the scenario's own steps to assert.
     */
    async swipeCarouselLeft(): Promise<void> {
        const box = await this.carouselBox();
        const leading = await this.leadingCard();
        for (let attempt = 1; attempt <= SWIPE_ATTEMPTS; attempt += 1) {
            await swipeLeftAcross(box);
            if (await this.hasMovedFrom(leading)) return;
            console.warn(
                `The carousel ignored swipe ${attempt} of ${SWIPE_ATTEMPTS}: "${leading.title}" did not move.`,
            );
        }
        throw new Error(
            `The carousel ignored ${SWIPE_ATTEMPTS} swipes in a row: "${leading.title}" never moved.`,
        );
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
     * The left-most card on screen: the first title, in carousel order, that is displayed. Cards
     * cannot be told apart by position alone, because after a swipe the next card takes exactly
     * the place of the one before it.
     */
    private async leadingCard(): Promise<CardPosition> {
        for (const title of CARD_TITLES) {
            const element = this.cardTitle(title);
            if (await element.isDisplayed()) {
                return { title, x: (await element.getLocation()).x };
            }
        }
        throw new Error('no carousel card title is displayed on the Swipe screen');
    }

    /**
     * Whether a card has moved: it has left the screen, or it is somewhere else on it. Only the
     * wait's own timeout means "did not move"; any other error is rethrown, so a broken session
     * can never be read as a dropped swipe.
     */
    private async hasMovedFrom({ title, x }: CardPosition): Promise<boolean> {
        const element = this.cardTitle(title);
        try {
            await browser.waitUntil(
                async () => !(await element.isDisplayed()) || (await element.getLocation()).x !== x,
                { timeout: MOVE_TIMEOUT, interval: 250, timeoutMsg: DID_NOT_MOVE },
            );
            return true;
        } catch (error) {
            if (error instanceof Error && error.message === DID_NOT_MOVE) return false;
            throw error;
        }
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
