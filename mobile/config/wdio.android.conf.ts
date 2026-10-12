import { existsSync } from 'node:fs';
import { config as sharedConfig } from './wdio.shared.conf.js';
import { ANDROID_APP } from './app.js';

if (!existsSync(ANDROID_APP.apkPath)) {
    throw new Error(`APK not found at ${ANDROID_APP.apkPath}. Run "npm run app:download" first.`);
}

export const config: WebdriverIO.Config = {
    ...sharedConfig,
    capabilities: [
        {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            // Physical device: the serial from `adb devices`. If omitted, Appium uses the only connected device.
            ...(process.env.ANDROID_UDID ? { 'appium:udid': process.env.ANDROID_UDID } : {}),
            'appium:app': ANDROID_APP.apkPath,
            'appium:appPackage': ANDROID_APP.packageName,
            'appium:appWaitActivity': ANDROID_APP.activity,
            'appium:autoGrantPermissions': true,
            'appium:newCommandTimeout': 240,
            'appium:orientation': 'PORTRAIT',
        },
    ],
};
