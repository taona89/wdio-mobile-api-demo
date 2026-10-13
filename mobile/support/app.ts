import { appId } from '../config/app.js';

/** The two values of Appium's `queryAppState` that a restart cares about. */
const NOT_RUNNING = 1;
const RUNNING_IN_FOREGROUND = 4;

const LAUNCH_ATTEMPTS = 3;

/** waitUntil reports a timeout with exactly this message; any other error is a real failure. */
const STATE_NOT_REACHED = 'app state not reached';

/**
 * The app's state, asked through the drivers' `mobile:` command. WebdriverIO's own
 * `queryAppState` uses an endpoint Appium has deprecated, and the two drivers name the
 * argument differently.
 */
const appState = (id: string): Promise<number> =>
    driver.execute<number, [Record<string, string>]>(
        'mobile: queryAppState',
        driver.isAndroid ? { appId: id } : { bundleId: id },
    );

/** True once the app reports `state`, false if it has not done so within `timeoutMs`. */
async function reaches(id: string, state: number, timeoutMs: number): Promise<boolean> {
    try {
        await driver.waitUntil(async () => (await appState(id)) === state, {
            timeout: timeoutMs,
            timeoutMsg: STATE_NOT_REACHED,
        });
        return true;
    } catch (error) {
        if (error instanceof Error && error.message === STATE_NOT_REACHED) return false;
        throw error;
    }
}

/**
 * Kill and relaunch the app so every scenario starts on the Home screen with fresh in-memory
 * state. Much faster than reinstalling, and keeps scenarios independent of each other's order.
 * Callers wait for a known screen afterwards, because activateApp can return before the UI is drawn.
 *
 * Neither half is taken on trust. On an iOS simulator, activateApp has returned successfully for
 * an app that was not running: every lookup after that finds nothing, and the scenario fails
 * thirty seconds later with the home screen in its screenshot. So the launch is checked against
 * the app's real state, and repeated if the app is not in the foreground.
 */
export async function restartApp(): Promise<void> {
    const id = appId();

    await driver.terminateApp(id);
    if (!(await reaches(id, NOT_RUNNING, 10_000))) {
        throw new Error(`${id} is still running 10 s after being terminated`);
    }

    for (let attempt = 1; attempt <= LAUNCH_ATTEMPTS; attempt++) {
        await driver.activateApp(id);
        if (await reaches(id, RUNNING_IN_FOREGROUND, 5_000)) return;
    }
    throw new Error(`${id} was launched ${LAUNCH_ATTEMPTS} times and never reached the foreground`);
}
