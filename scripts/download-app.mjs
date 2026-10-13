#!/usr/bin/env node
/**
 * Downloads a WebdriverIO Native Demo App build into ./apps (gitignored, ~120 MB).
 * The version comes from package.json `config.appVersion`, the same value the WDIO config uses.
 * Usage: npm run app:download        (Android APK)
 *        npm run app:download:ios    (iOS simulator .zip)
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const rootDir = join(import.meta.dirname, '..');
const { appVersion } = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).config;

const FILE_NAMES = {
    android: `android.wdio.native.app.v${appVersion}.apk`,
    ios: `ios.simulator.wdio.native.app.v${appVersion}.zip`,
};

const platform = process.argv[2] ?? 'android';
const fileName = FILE_NAMES[platform];
if (!fileName) {
    console.error(`Unknown platform "${platform}". Use one of: ${Object.keys(FILE_NAMES).join(', ')}.`);
    process.exit(1);
}
const url = `https://github.com/webdriverio/native-demo-app/releases/download/v${appVersion}/${fileName}`;
const appsDir = join(rootDir, 'apps');
const target = join(appsDir, fileName);

if (existsSync(target) && statSync(target).size > 0) {
    console.log(`${fileName} is already in ./apps, nothing to do.`);
    process.exit(0);
}

mkdirSync(appsDir, { recursive: true });
console.log(`Downloading ${url}`);

const response = await fetch(url);
if (!response.ok || !response.body) {
    console.error(`Download failed: HTTP ${response.status} ${response.statusText}`);
    process.exit(1);
}

// Write to a temporary file first so an interrupted download never leaves a corrupt file behind.
const partial = `${target}.part`;
await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
renameSync(partial, target);

const sizeMb = (statSync(target).size / 1024 / 1024).toFixed(1);
console.log(`Saved ${fileName} (${sizeMb} MB) to ./apps`);
