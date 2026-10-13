import { allureReporting, config as sharedConfig, prepareArtifactsDir } from './wdio.shared.conf.js';
import { IOS_APP, assertIosAppPresent } from './app.js';

const allure = allureReporting('iOS');

/**
 * iOS simulator capabilities. Everything above the capabilities level — features, steps, page
 * objects — is shared with Android unchanged, which is the point of locating elements by
 * accessibility id.
 *
 * It needs macOS, Xcode, and `npx appium driver install xcuitest` (the driver is not a project
 * dependency, so that `npm ci` stays light for Android-only machines). There is no Mac among the
 * development machines, so it is run by .github/workflows/ios.yml on a GitHub Actions runner,
 * which also turns off the simulator's password AutoFill - the sign-up scenarios need that. See
 * README.
 */
export const config: WebdriverIO.Config = {
    ...sharedConfig,
    reporters: [...(sharedConfig.reporters ?? []), allure.reporter],
    // Ordered: a missing app aborts the run before the previous run's evidence is cleared.
    onPrepare: [assertIosAppPresent, prepareArtifactsDir, allure.clearResults],
    onComplete: allure.groupResults,
    // The first session compiles WebDriverAgent with xcodebuild, which takes several minutes on a
    // cold machine (a CI runner always is one), so both waits are far above the shared defaults.
    connectionRetryTimeout: 900_000,
    capabilities: [
        {
            platformName: 'iOS',
            'appium:automationName': 'XCUITest',
            // Override per machine: `xcrun simctl list devices available` shows what is installed.
            'appium:deviceName': process.env.IOS_DEVICE_NAME ?? 'iPhone 16',
            'appium:platformVersion': process.env.IOS_PLATFORM_VERSION ?? '18.2',
            // A .zip of the .app; the XCUITest driver unpacks it before installing.
            'appium:app': IOS_APP.appPath,
            'appium:bundleId': IOS_APP.bundleId,
            'appium:orientation': 'PORTRAIT',
            'appium:newCommandTimeout': 240,
            'appium:wdaLaunchTimeout': 600_000,
            'appium:simulatorStartupTimeout': 300_000,
        },
    ],
};
