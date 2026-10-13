import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SevereServiceError } from 'webdriverio';

/** Repo root, resolved from this file so commands work from any working directory. */
export const ROOT_DIR = join(import.meta.dirname, '..', '..');

/**
 * The app version lives once, in package.json (`config.appVersion`), and is shared with
 * scripts/download-app.mjs so the downloaded build and the tested build cannot drift apart.
 */
const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf8')) as {
    config: { appVersion: string };
};
export const APP_VERSION = pkg.config.appVersion;

const APPS_DIR = join(ROOT_DIR, 'apps');

/** Package and launch activity from the app's AndroidManifest.xml (also confirmed in the APK). */
export const ANDROID_APP = {
    packageName: 'com.wdiodemoapp',
    activity: 'com.wdiodemoapp.MainActivity',
    appPath: join(APPS_DIR, `android.wdio.native.app.v${APP_VERSION}.apk`),
} as const;

/**
 * From the app's app.json. Since the v2 (Expo) rewrite this is `org.wdiodemoapp`; older docs and
 * WebdriverIO's deepLink example still show `org.reactjs.native.example.wdiodemoapp`.
 *
 * The release ships the simulator build as a .zip, which the XCUITest driver unpacks itself.
 */
export const IOS_APP = {
    bundleId: 'org.wdiodemoapp',
    appPath: join(APPS_DIR, `ios.simulator.wdio.native.app.v${APP_VERSION}.zip`),
} as const;

export const appId = (): string => (driver.isAndroid ? ANDROID_APP.packageName : IOS_APP.bundleId);

/**
 * Fail fast in the launcher with an actionable message instead of a deep Appium install error.
 * Must be a SevereServiceError: WebdriverIO logs any other error thrown in onPrepare and carries on.
 */
function assertAppPresent(appPath: string, downloadCommand: string): void {
    if (!existsSync(appPath)) {
        throw new SevereServiceError(`App not found at ${appPath}. Run "${downloadCommand}" first.`);
    }
}

export const assertAndroidAppPresent = (): void =>
    assertAppPresent(ANDROID_APP.appPath, 'npm run app:download');

export const assertIosAppPresent = (): void => assertAppPresent(IOS_APP.appPath, 'npm run app:download:ios');
