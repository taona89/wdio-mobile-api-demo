import { appId } from '../config/app.js';

/**
 * Kill and relaunch the app so every scenario starts on the Home screen with fresh in-memory
 * state. Much faster than reinstalling, and keeps scenarios independent of each other's order.
 * Callers wait for a known screen afterwards, because activateApp can return before the UI is drawn.
 */
export async function restartApp(): Promise<void> {
    const id = appId();
    await driver.terminateApp(id);
    await driver.activateApp(id);
}
