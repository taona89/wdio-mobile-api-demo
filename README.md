# Mobile & API Test Automation

Automated tests for the [WebdriverIO Native Demo App](https://github.com/webdriverio/native-demo-app) (v2.2.0) using **WebdriverIO 10 + Appium 3** on a physical Android device, and API tests for [Restful Booker](https://restful-booker.herokuapp.com/apidoc/index.html) using **Playwright's built-in request API**.

| Part   | Stack                                                          | Target                         |
| ------ | -------------------------------------------------------------- | ------------------------------ |
| Mobile | WebdriverIO 10, Appium 3, UiAutomator2, Mocha, TypeScript      | Android physical device        |
| API    | Playwright Test (`APIRequestContext`), zod schemas, TypeScript | `restful-booker.herokuapp.com` |

## Prerequisites

| Tool                         | Version              | Check                |
| ---------------------------- | -------------------- | -------------------- |
| Node.js                      | 22.19+               | `node -v`            |
| Java JDK                     | 17+                  | `java -version`      |
| Android SDK (platform-tools) | any recent           | `adb version`        |
| `ANDROID_HOME` env var       | set to your SDK path | `echo $ANDROID_HOME` |
| `JAVA_HOME` env var          | set to your JDK path | `echo $JAVA_HOME`    |

Appium and the UiAutomator2 driver are **project dependencies**, so `npm install` provides them. No global Appium install is needed.

### Prepare the Android device

1. Enable **Developer options** (Settings → About phone → tap _Build number_ 7 times).
2. Enable **USB debugging** and connect the phone. Accept the "Allow USB debugging" prompt.
3. `adb devices` should list the device as `device` (not `unauthorized`).

## Setup

```bash
npm install
npm run app:download      # fetches the v2.2.0 APK into ./apps (≈120 MB, gitignored)
cp .env.example .env      # optionally set ANDROID_UDID to your `adb devices` serial
npm run appium:doctor     # checks ANDROID_HOME, JAVA_HOME and adb; fix any ✖ marked "required"
```

## Running the tests

```bash
npm run test:android      # mobile suite on the connected Android device
npm run test:api          # API suite against the public Restful Booker
npm run test:api:report   # open the Playwright HTML report
```

Quality checks: `npm run typecheck` and `npm run lint`.

Evidence is written to `mobile/artifacts/` (a screenshot per test, prefixed `PASS__`/`FAIL__`, plus the Appium log) and `api/playwright-report/`.

## Project structure

```
mobile/
  config/        wdio.shared.conf.ts (platform-agnostic) + wdio.android.conf.ts (capabilities only)
  src/screens/   Screen Objects (AppScreen base, LoginScreen, TabBar, NativeAlert)
  src/helpers/   cross-platform selectors, app restart
  src/data/      test data and the app's exact UI messages
  specs/         one spec file per feature
api/
  support/       API client, fixtures (with automatic cleanup), payload builder, zod schemas
  tests/         auth.spec.ts, booking.spec.ts
scripts/         download-app.mjs
```

## Test coverage

### Mobile

| #   | Scenario                   | Spec             | Assertion                                                             |
| --- | -------------------------- | ---------------- | --------------------------------------------------------------------- |
| 1   | Sign up – new account      | `signup.spec.ts` | Alert title and message: "Signed Up!" / "You successfully signed up!" |
|     | Sign up – passwords differ | `signup.spec.ts` | "Please enter the same password", and no success alert                |
| 2   | Login – happy path         | `login.spec.ts`  | Alert title and message: "Success" / "You are logged in!"             |
| 3   | Login – invalid password   | `login.spec.ts`  | "Please enter at least 8 characters", and no success alert            |
|     | Login – invalid email      | `login.spec.ts`  | "Please enter a valid email address", and no success alert            |

### API

| Scenario                                  | Assertion                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `POST /auth` valid credentials            | 200, JSON, body matches schema, non-empty `token`                          |
| `POST /auth` invalid credentials          | No `token`; body is exactly `{ "reason": "Bad credentials" }`              |
| `POST /booking` valid payload             | 200, schema-valid, `bookingid` > 0, `booking` deep-equals the request      |
| `POST /booking` without `additionalneeds` | Booking created; optional field absent in response                         |
| `GET /booking/{id}` after create          | Stored booking deep-equals the request (proves persistence, not just echo) |

Every booking a test creates is deleted afterwards by the `trackBooking` fixture, so the shared public API is left as it was found.

## Design decisions

- **Screen Object Model** with a shared `AppScreen` base. Specs read as user intent; locators live in one place.
- **Accessibility-id locators.** The app sets `accessibilityLabel` (Android) and `testID` (iOS) from the same string, so `~id` selectors are shared across platforms. Validation messages have no id and are located by exact text through a platform-aware `byText()` helper.
- **Test independence.** Each test kills and relaunches the app (`terminateApp`/`activateApp`) so no state leaks between tests, without the cost of reinstalling.
- **No fixed sleeps.** All waits are condition-based. The only bounded wait proves a negative ("no success alert within 3 s"), sized to the app's simulated 1.5 s request.
- **Explicit alert handling.** WebdriverIO 10's `acceptDialog()` targets OS permission prompts and silently succeeds when no dialog is present, so a dedicated `NativeAlert` component asserts the alert's exact title and message.
- **Exact-string assertions** against the app's real copy (taken from its source) so text regressions are caught.
- **Platform split by configuration.** Test logic is platform-agnostic; platform configs only add capabilities.
- **Playwright for the API part.** WebdriverIO has no built-in HTTP request API, while Playwright's `APIRequestContext` is a first-class one. Responses are validated with zod schemas in addition to value assertions.
- **No retries locally.** Failures stay visible. CI gets one retry for transient network errors on the shared Heroku host.

## Assumptions and observations

- **"Wrong password" on a client-only app.** The demo app has no backend. It accepts any well-formed email with a password of 8+ characters (`src/components/LoginForm.tsx`), so a "wrong" password can only be one that fails that rule. The invalid-credentials test therefore asserts the app's validation error.
- **Restful Booker normalises stored data:** it trims names, truncates prices with `parseInt`, and reformats dates to `YYYY-MM-DD`. The payload builder produces canonical data so "response equals request" is an exact assertion. A decimal price would make it fail by design.
- **API quirks observed:** invalid credentials return `200 OK` (not `401`) with a `reason` body; an unsupported `Accept` header returns `418`; successful `DELETE` returns `201`.
- **Cold starts:** the API is hosted on Heroku, so a global setup step calls `GET /ping` (expects `201`) before the suite runs.
