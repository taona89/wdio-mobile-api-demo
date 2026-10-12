import { join } from 'node:path';

/**
 * Single source of truth for the app under test.
 * Values verified against the native-demo-app v2.2.0 source (app.json / AndroidManifest.xml).
 */
export const APP_VERSION = '2.2.0';

export const ANDROID_APP = {
    packageName: 'com.wdiodemoapp',
    activity: 'com.wdiodemoapp.MainActivity',
    apkPath: join(process.cwd(), 'apps', `android.wdio.native.app.v${APP_VERSION}.apk`),
} as const;

/** Bundle ID changed in v2.x; the old `org.reactjs.native.example.wdiodemoapp` no longer applies. */
export const IOS_APP = {
    bundleId: 'org.wdiodemoapp',
} as const;

export const appId = (): string => (driver.isAndroid ? ANDROID_APP.packageName : IOS_APP.bundleId);
