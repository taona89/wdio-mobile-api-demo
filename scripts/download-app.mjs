#!/usr/bin/env node
/**
 * Downloads the WebdriverIO Native Demo App APK into ./apps (gitignored, ~120 MB).
 * Usage: npm run app:download            (default version below)
 *        APP_VERSION=2.2.0 npm run app:download
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const version = process.env.APP_VERSION ?? '2.2.0';
const fileName = `android.wdio.native.app.v${version}.apk`;
const url = `https://github.com/webdriverio/native-demo-app/releases/download/v${version}/${fileName}`;
const appsDir = join(process.cwd(), 'apps');
const target = join(appsDir, fileName);

if (existsSync(target) && statSync(target).size > 0) {
    console.log(`✔ ${fileName} already present in ./apps`);
    process.exit(0);
}

mkdirSync(appsDir, { recursive: true });
console.log(`↓ Downloading ${url}`);

const response = await fetch(url);
if (!response.ok || !response.body) {
    console.error(`✖ Download failed: HTTP ${response.status} ${response.statusText}`);
    process.exit(1);
}

// Write to a temp file first so an interrupted download never leaves a corrupt APK in place.
const partial = `${target}.part`;
await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
renameSync(partial, target);

const sizeMb = (statSync(target).size / 1024 / 1024).toFixed(1);
console.log(`✔ Saved ${fileName} (${sizeMb} MB) to ./apps`);
