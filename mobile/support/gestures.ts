/**
 * Swipe gestures built on W3C pointer actions, so the same code drives UiAutomator2 and XCUITest.
 * (The old `touchAction` API is deprecated and Appium 3 drops parts of it.)
 *
 * These are for a gesture that must land on a *particular widget*, such as paging a carousel.
 * Scrolling a whole screen goes through `AppPage.scrollTo` instead, which drives the scrollable
 * container: a coordinate drag is swallowed by any child that handles its own gestures.
 */

interface Point {
    x: number;
    y: number;
}

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

const TOUCH = { parameters: { pointerType: 'touch' as const } };

/** One finger down, drag, up. Coordinates are absolute, relative to the viewport. */
export async function swipe(from: Point, to: Point, durationMs = 600): Promise<void> {
    await driver
        .action('pointer', TOUCH)
        .move({ x: Math.round(from.x), y: Math.round(from.y) })
        .down()
        // Let the gesture recogniser register a stationary touch before it starts travelling,
        // otherwise a fast carousel can read the whole thing as a tap.
        .pause(100)
        .move({ x: Math.round(to.x), y: Math.round(to.y), duration: durationMs })
        .up()
        .perform();
}

/**
 * Swipe left across an element's own box. A carousel only responds to a gesture that starts
 * inside it, so a screen-wide swipe is not enough.
 */
export async function swipeLeftAcross({ x, y, width, height }: Box): Promise<void> {
    const midY = y + height / 2;
    await swipe({ x: x + width * 0.9, y: midY }, { x: x + width * 0.1, y: midY });
}
