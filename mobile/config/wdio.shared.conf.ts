import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import 'dotenv/config';

const ARTIFACTS_DIR = join(process.cwd(), 'mobile', 'artifacts');
const SCREENSHOTS_DIR = join(ARTIFACTS_DIR, 'screenshots');

/**
 * Platform-agnostic configuration. Platform configs (wdio.android.conf.ts, later
 * wdio.ios.conf.ts) spread this and only add capabilities, so test logic is shared.
 */
export const config: Omit<WebdriverIO.Config, 'capabilities'> = {
    runner: 'local',
    specs: ['../specs/**/*.spec.ts'],
    maxInstances: 1,
    logLevel: 'warn',
    outputDir: join(ARTIFACTS_DIR, 'logs'),
    bail: 0,
    waitforTimeout: 15_000,
    connectionRetryTimeout: 120_000,
    connectionRetryCount: 2,
    specFileRetries: 0,

    services: [
        [
            'appium',
            {
                // Appium and the UiAutomator2 driver are project devDependencies, no global install needed.
                args: {
                    log: join(ARTIFACTS_DIR, 'logs', 'appium.log'),
                },
            },
        ],
    ],

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 120_000,
        retries: 0,
    },

    reporters: [['spec', { showPreface: false }]],

    onPrepare() {
        mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    },

    async before() {
        if (driver.isAndroid) {
            // UiAutomator2 waits this long for each element lookup; WDIO's own waits handle the rest.
            await driver.updateSettings({ waitForSelectorTimeout: 3_000 });
        }
    },

    /** Evidence: screenshot every test (pass or fail), named by result. */
    async afterTest(test, _context, { passed }) {
        const safeTitle = `${test.parent} ${test.title}`.replace(/[^a-z0-9]+/gi, '_').slice(0, 120);
        const status = passed ? 'PASS' : 'FAIL';
        await driver.saveScreenshot(join(SCREENSHOTS_DIR, `${status}__${safeTitle}.png`));
    },
};
