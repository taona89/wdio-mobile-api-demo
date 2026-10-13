import { Before } from '@cucumber/cucumber';
import { restartApp } from './app.js';

/**
 * Every scenario starts from a freshly launched app, so order never matters and nothing leaks
 * between scenarios.
 *
 * This is a hook rather than a Given step on purpose: isolation is a property of the harness, not
 * part of any scenario's specification, and a hook cannot be left out when someone adds a feature
 * file. Evidence capture lives in the WebdriverIO config, which is the only place with access to
 * the pass/fail result.
 */
Before(async () => {
    await restartApp();
});
