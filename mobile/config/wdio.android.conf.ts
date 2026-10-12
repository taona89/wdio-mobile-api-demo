import { config as sharedConfig, prepareArtifactsDir } from './wdio.shared.conf.js';
import { ANDROID_APP, assertApkPresent } from './app.js';

export const config: WebdriverIO.Config = {
    ...sharedConfig,
    onPrepare: [assertApkPresent, prepareArtifactsDir],
    capabilities: [
        {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            // Serial from `adb devices`. If unset, Appium picks the first device adb lists, so set it
            // whenever more than one device or emulator is connected.
            ...(process.env.ANDROID_UDID ? { 'appium:udid': process.env.ANDROID_UDID } : {}),
            'appium:app': ANDROID_APP.apkPath,
            'appium:appPackage': ANDROID_APP.packageName,
            'appium:appWaitActivity': ANDROID_APP.activity,
            // The default 90 s can be too short for a first USB install of the ~120 MB APK.
            'appium:androidInstallTimeout': 180_000,
            'appium:newCommandTimeout': 240,
            'appium:orientation': 'PORTRAIT',
        },
    ],
};
