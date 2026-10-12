import { appId } from '../../config/app.js';

/**
 * Kill and relaunch the app so every test starts from the Home screen with fresh
 * in-memory state. Faster than a full reinstall and keeps tests independent.
 */
export async function restartApp(): Promise<void> {
    const id = appId();
    await driver.terminateApp(id);
    await driver.activateApp(id);
}
