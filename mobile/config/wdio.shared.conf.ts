import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { ROOT_DIR } from './app.js';

dotenv.config({ path: join(ROOT_DIR, '.env'), quiet: true });

const MOBILE_DIR = join(ROOT_DIR, 'mobile');
const ARTIFACTS_DIR = join(MOBILE_DIR, 'artifacts');
const SCREENSHOTS_DIR = join(ARTIFACTS_DIR, 'screenshots');
const LOGS_DIR = join(ARTIFACTS_DIR, 'logs');
const ALLURE_RESULTS_DIR = join(ARTIFACTS_DIR, 'allure-results');

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
 * Only the screenshots and Allure results are removed. WebdriverIO opens its own log file under `outputDir` when the
 * launcher starts, so deleting that directory here would pull an open file handle out from under
 * it (EBUSY on Windows, silently lost writes on POSIX).
 */
export function prepareArtifactsDir(): void {
    rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    // Same reason: Allure merges every result file it finds, so old runs would pad the report.
    rmSync(ALLURE_RESULTS_DIR, { recursive: true, force: true });
    mkdirSync(LOGS_DIR, { recursive: true });
}

interface AllureLabel {
    name: string;
    value: string;
}

/**
 * Nest every feature under a "Mobile" parent suite, so the combined report (`npm run report`)
 * shows Mobile and API side by side.
 *
 * This rewrites the result files after the run because the reporter leaves no other way in: it
 * always emits the feature name as `parentSuite`, and Allure lists a test once per value of a
 * label, so adding a second `parentSuite` from a hook shows every scenario twice.
 */
export function groupAllureResultsUnderMobile(): void {
    if (!existsSync(ALLURE_RESULTS_DIR)) return;

    for (const file of readdirSync(ALLURE_RESULTS_DIR)) {
        if (!file.endsWith('-result.json')) continue;

        const path = join(ALLURE_RESULTS_DIR, file);
        const result = JSON.parse(readFileSync(path, 'utf8')) as { labels: AllureLabel[] };
        result.labels = result.labels.map((label) =>
            label.name === 'parentSuite' ? { ...label, name: 'suite' } : label,
        );
        result.labels.push({ name: 'parentSuite', value: 'Mobile' });
        writeFileSync(path, JSON.stringify(result));
    }
}

const fileSafe = (text: string): string => text.replace(/[^a-z0-9]+/gi, '_').slice(0, 120);

/** Screenshot plus the native view hierarchy: the XML is what you need to debug a failing locator. */
async function captureFailure(name: string): Promise<void> {
    await driver.saveScreenshot(join(SCREENSHOTS_DIR, `FAIL__${name}.png`));
    writeFileSync(join(SCREENSHOTS_DIR, `FAIL__${name}.xml`), await driver.getPageSource());
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
     */
    services: [['appium', { appiumStartTimeout: 120_000 }]],

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

    reporters: [
        ['spec', { showPreface: false }],
        [
            'allure',
            {
                outputDir: ALLURE_RESULTS_DIR,
                // Report Gherkin steps as the test steps instead of the raw WebDriver commands.
                useCucumberStepReporter: true,
                disableWebdriverStepsReporting: true,
                // Keep the saveScreenshot calls from the hooks below as attachments.
                disableWebdriverScreenshotsReporting: false,
            },
        ],
    ],

    onPrepare: prepareArtifactsDir,
    onComplete: groupAllureResultsUnderMobile,

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
