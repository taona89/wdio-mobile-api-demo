import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { ROOT_DIR } from './app.js';

dotenv.config({ path: join(ROOT_DIR, '.env'), quiet: true });

const ARTIFACTS_DIR = join(ROOT_DIR, 'mobile', 'artifacts');
const SCREENSHOTS_DIR = join(ARTIFACTS_DIR, 'screenshots');
const LOGS_DIR = join(ARTIFACTS_DIR, 'logs');

/** Clear the previous run's evidence so a stale FAIL screenshot never sits next to a new PASS. */
export function prepareArtifactsDir(): void {
    rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    mkdirSync(LOGS_DIR, { recursive: true });
}

const fileSafe = (text: string): string => text.replace(/[^a-z0-9]+/gi, '_').slice(0, 120);

/** Screenshot plus the native view hierarchy: the XML is what you need to debug a failing locator. */
async function captureFailure(name: string): Promise<void> {
    await driver.saveScreenshot(join(SCREENSHOTS_DIR, `FAIL__${name}.png`));
    writeFileSync(join(SCREENSHOTS_DIR, `FAIL__${name}.xml`), await driver.getPageSource());
}

/**
 * Platform-agnostic configuration. Platform configs (wdio.android.conf.ts; iOS on Day 2) spread
 * this and add only capabilities, so all test logic is shared between platforms.
 */
export const config: Omit<WebdriverIO.Config, 'capabilities'> = {
    runner: 'local',
    // Resolved relative to this config file.
    specs: ['../specs/**/*.spec.ts'],
    // One physical device, so one session at a time.
    maxInstances: 1,
    logLevel: 'warn',
    // WebdriverIO worker logs, and the Appium service writes wdio-appium.log here too.
    outputDir: LOGS_DIR,
    waitforTimeout: 15_000,
    // Session creation includes installing a ~120 MB APK over USB on the first run.
    connectionRetryTimeout: 300_000,
    connectionRetryCount: 1,

    // Starts the project-local Appium 3 server (with the UiAutomator2 driver from devDependencies).
    services: ['appium'],

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        // Per test, generous because beforeEach relaunches the app on a real device.
        timeout: 120_000,
    },

    reporters: [['spec', { showPreface: false }]],

    onPrepare: prepareArtifactsDir,

    async before() {
        if (driver.isAndroid) {
            // Caps how long UiAutomator2 itself waits for `android=` (UiSelector) lookups, which byText()
            // uses; WebdriverIO's waitFor* commands own all other waiting.
            await driver.updateSettings({ waitForSelectorTimeout: 3_000 });
        }
    },

    /** A hook failure (e.g. beforeEach navigation) never reaches afterTest, so capture it here. */
    async afterHook(test, _context, { passed }, hookName) {
        if (!passed) await captureFailure(fileSafe(`${hookName} ${test.parent ?? ''} ${test.title ?? ''}`));
    },

    /** Evidence for the submission: a screenshot of every test's end state, prefixed by result. */
    async afterTest(test, _context, { passed }) {
        const name = fileSafe(`${test.parent} ${test.title}`);
        if (passed) {
            await driver.saveScreenshot(join(SCREENSHOTS_DIR, `PASS__${name}.png`));
        } else {
            await captureFailure(name);
        }
    },
};
