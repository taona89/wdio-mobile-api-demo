import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { ROOT_DIR } from './app.js';

dotenv.config({ path: join(ROOT_DIR, '.env'), quiet: true });

const MOBILE_DIR = join(ROOT_DIR, 'mobile');
const ARTIFACTS_DIR = join(MOBILE_DIR, 'artifacts');
const SCREENSHOTS_DIR = join(ARTIFACTS_DIR, 'screenshots');
const LOGS_DIR = join(ARTIFACTS_DIR, 'logs');

/**
 * Support and step files are listed explicitly rather than matched with a glob.
 *
 * On Windows, @wdio/cucumber-framework converts each entry to a file:// URL *before* testing it
 * for glob characters, so `steps/*.steps.ts` becomes `file:///C:/.../steps/*.steps.ts`. The glob
 * matcher cannot resolve that, matches nothing, and every step then reports as undefined with no
 * explanation. Explicit paths behave identically on Windows, macOS and Linux, and they make the
 * load order deterministic.
 */
const SUPPORT_FILES = ['hooks.ts'].map((file) => join(MOBILE_DIR, 'support', file));

const STEP_FILES = [
    'navigation.steps.ts',
    'login.steps.ts',
    'signup.steps.ts',
    'forms.steps.ts',
    'swipe.steps.ts',
    'alert.steps.ts',
    'validation.steps.ts',
].map((file) => join(MOBILE_DIR, 'steps', file));

/**
 * Clear the previous run's screenshots so a stale FAIL never sits next to a new PASS.
 *
 * Only the screenshots are removed. WebdriverIO opens its own log file under `outputDir` when the
 * launcher starts, so deleting that directory here would pull an open file handle out from under
 * it (EBUSY on Windows, silently lost writes on POSIX).
 */
export function prepareArtifactsDir(): void {
    rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    mkdirSync(LOGS_DIR, { recursive: true });
}

export type Platform = 'Android' | 'iOS';

interface AllureResult {
    labels: { name: string; value: string }[];
    historyId?: string;
    testCaseId?: string;
}

/**
 * Allure reporting for one platform's run.
 *
 * Each platform writes to its own results directory, so an Android run never clears an iOS run's
 * results and `npm run report` can merge both. `groupResults` then files every scenario under
 * Mobile > <platform> > <feature>, so the two runs sit side by side instead of on top of each other.
 */
export function allureReporting(platform: Platform) {
    const resultsDir = join(ARTIFACTS_DIR, 'allure-results', platform.toLowerCase());

    return {
        reporter: [
            'allure',
            {
                outputDir: resultsDir,
                // Report Gherkin steps as the test steps instead of the raw WebDriver commands.
                useCucumberStepReporter: true,
                disableWebdriverStepsReporting: true,
                // Keep the saveScreenshot calls from the hooks below as attachments.
                disableWebdriverScreenshotsReporting: false,
            },
        ] as [string, Record<string, unknown>],

        /** Allure merges every result file it finds, so a previous run would pad the report. */
        clearResults: (): void => {
            rmSync(resultsDir, { recursive: true, force: true });
        },

        /**
         * Rewrites the result files after the run, because the reporter leaves no other way in:
         * it always emits the feature name as `parentSuite`, and Allure lists a test once per value
         * of a label, so adding a second `parentSuite` from a hook shows every scenario twice.
         *
         * The ids are made platform-specific for the same reason the suites are: the scenarios are
         * shared, so without it Allure sees the iOS and Android results as retries of one test and
         * shows only the newer of the two.
         */
        groupResults: (): void => {
            if (!existsSync(resultsDir)) return;
            const perPlatform = (id: string): string =>
                createHash('md5').update(`${id}:${platform}`).digest('hex');

            for (const file of readdirSync(resultsDir)) {
                if (!file.endsWith('-result.json')) continue;

                const path = join(resultsDir, file);
                const result = JSON.parse(readFileSync(path, 'utf8')) as AllureResult;
                result.labels = result.labels.map((label) =>
                    label.name === 'parentSuite' ? { ...label, name: 'subSuite' } : label,
                );
                result.labels.push(
                    { name: 'parentSuite', value: 'Mobile' },
                    { name: 'suite', value: platform },
                );
                if (result.historyId) result.historyId = perPlatform(result.historyId);
                if (result.testCaseId) result.testCaseId = perPlatform(result.testCaseId);
                writeFileSync(path, JSON.stringify(result));
            }
        },
    };
}

const fileSafe = (text: string): string => text.replace(/[^a-z0-9]+/gi, '_').slice(0, 120);

/** Screenshot plus the native view hierarchy: the XML is what you need to debug a failing locator. */
async function captureFailure(name: string): Promise<void> {
    await driver.saveScreenshot(join(SCREENSHOTS_DIR, `FAIL__${name}.png`));
    // There is no hierarchy to dump when the app itself is not running. The driver's reason is
    // then the evidence, and it must not replace the scenario's own failure.
    const source = await driver
        .getPageSource()
        .catch((error: unknown) => `<!-- view hierarchy unavailable: ${String(error)} -->`);
    writeFileSync(join(SCREENSHOTS_DIR, `FAIL__${name}.xml`), source);
}

/**
 * Whether the current scenario already has failure evidence. A failing step captures the exact
 * step that broke; this flag stops afterScenario adding a second, less useful capture on top.
 */
let failureCaptured = false;

/**
 * Platform-agnostic configuration. Platform configs (wdio.android.conf.ts, wdio.ios.conf.ts)
 * spread this and add only capabilities, so every feature, step and page object is shared.
 */
export const config: Omit<WebdriverIO.Config, 'capabilities'> = {
    runner: 'local',
    // Resolved relative to this config file.
    specs: ['../features/**/*.feature'],
    // One physical device, so one session at a time.
    maxInstances: 1,
    logLevel: 'warn',
    // WebdriverIO worker logs, and the Appium service writes wdio-appium.log here too.
    outputDir: LOGS_DIR,
    waitforTimeout: 15_000,
    // Session creation includes installing a ~120 MB app over USB on the first run.
    connectionRetryTimeout: 300_000,
    connectionRetryCount: 1,

    /**
     * Starts the project-local Appium 3 server (with the driver from devDependencies).
     *
     * `appiumStartTimeout` is raised from the service's 30 s default because that default is not
     * enough for Appium's first start on a cold machine, and the failure is silent and confusing:
     * the service waits for Appium to print "Appium REST http interface listener started", and on
     * timeout it throws from onPrepare - which WebdriverIO logs and then carries on. Workers then
     * race a server that is not listening yet and fail with "Unable to connect to
     * http://127.0.0.1:4723/", which looks like a port or firewall problem rather than a timeout.
     *
     * `keepAliveTimeout` (seconds) is Appium's limit on any one request, 600 by default. Creating
     * the first iOS session on a CI runner takes about that long, because resetting the simulator,
     * installing the app and compiling WebDriverAgent all happen inside that single request. When
     * it overran, Appium closed the connection, WebdriverIO opened a second session, and the
     * abandoned first one carried on against the same simulator.
     */
    services: [['appium', { appiumStartTimeout: 120_000, args: { keepAliveTimeout: 1_800 } }]],

    framework: 'cucumber',
    cucumberOpts: {
        import: [...SUPPORT_FILES, ...STEP_FILES],
        // Per step, generous because a real device is slow and the Before hook relaunches the app.
        timeout: 120_000,
        // An undefined or pending step fails the run instead of being reported as skipped. This is
        // the Cucumber equivalent of the guard that `mocha/no-exclusive-tests` gave the old specs:
        // without it, a feature file can describe behaviour nobody implemented and still go green.
        strict: true,
        // Two step definitions matching one step is a mistake, not something to resolve silently.
        failAmbiguousDefinitions: true,
    },

    // Platform configs add their own Allure reporter: see allureReporting().
    reporters: [['spec', { showPreface: false }]],

    onPrepare: prepareArtifactsDir,

    async before() {
        if (driver.isAndroid) {
            // Caps how long UiAutomator2 itself waits for `android=` (UiSelector) lookups, which
            // byText() uses; WebdriverIO's waitFor* commands own all other waiting.
            await driver.updateSettings({ waitForSelectorTimeout: 3_000 });
        }
    },

    beforeScenario() {
        failureCaptured = false;
    },

    /** A failing step is the most precise place to dump the view hierarchy. */
    async afterStep(step, scenario, { passed }) {
        if (passed) return;
        await captureFailure(fileSafe(`${scenario.name} ${step.text}`));
        failureCaptured = true;
    },

    /**
     * Evidence for the submission: a screenshot of every scenario's end state, prefixed by result.
     * The failure branch also covers a scenario that died in the Before hook, where no step ran
     * and afterStep therefore never fired.
     */
    async afterScenario(world, { passed }) {
        const name = fileSafe(world.pickle.name);
        if (passed) {
            await driver.saveScreenshot(join(SCREENSHOTS_DIR, `PASS__${name}.png`));
        } else if (!failureCaptured) {
            await captureFailure(name);
        }
    },
};
