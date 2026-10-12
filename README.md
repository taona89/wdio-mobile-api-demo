# Mobile & API Test Automation

Automated tests for the [WebdriverIO Native Demo App](https://github.com/webdriverio/native-demo-app) (v2.2.0) with **WebdriverIO 10 + Appium 3** on a physical Android device, and API tests for [Restful Booker](https://restful-booker.herokuapp.com/apidoc/index.html) with **Playwright's built-in request API**.

| Part   | Stack                                                          | Target                         |
| ------ | -------------------------------------------------------------- | ------------------------------ |
| Mobile | WebdriverIO 10, Appium 3, UiAutomator2, Mocha, TypeScript      | Android physical device        |
| API    | Playwright Test (`APIRequestContext`), zod schemas, TypeScript | `restful-booker.herokuapp.com` |

## Requirement coverage

| Brief requirement                         | Covered by                                                                       | Status  | Notes                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------- | ------- | -------------------------------------------------------- |
| 1. Signup                                 | `mobile/specs/signup.spec.ts`                                                    | Done    | Plus a negative case: passwords that don't match         |
| 2. Login, happy path                      | `mobile/specs/login.spec.ts` › logs in with valid credentials                    | Done    |                                                          |
| 3. Login, invalid credentials             | `mobile/specs/login.spec.ts` › with invalid credentials                          | Done    | **Deviation, see below**                                 |
| 4. Form interaction                       |                                                                                  | Planned |                                                          |
| 5. Swipe / scroll                         |                                                                                  | Planned |                                                          |
| 6. Bonus scenario                         |                                                                                  | Planned |                                                          |
| Bonus: both platforms, shared test logic  | Shared config + platform config split; `byId`/`byText` and iOS branches in place | Partial | Android verified; iOS config to follow                   |
| API 1. Auth: token returned               | `api/tests/auth.spec.ts`                                                         | Done    | Also proves the token authorises a protected operation   |
| API 2. Create booking: response = request | `api/tests/booking.spec.ts`                                                      | Done    | Three payload variants, a read-back, and a negative case |

### Deviation: "wrong password" on an app with no backend

The demo app has no server. `src/components/LoginForm.tsx` only checks that the email is well formed and the password has at least 8 characters; anything that passes gets the success alert. So the app cannot know a password is "wrong" unless it breaks that rule. The tests therefore:

- **reject a wrong password** one character below the minimum, and assert the exact error "Please enter at least 8 characters" (and that no success alert follows);
- **reject a malformed email**, asserting its error message;
- **record a finding**: a well-formed but wrong 8-character password logs in. This characterisation test passes today and would fail the moment real credential checking is added. In a team setting this goes to the product owner; against a real backend, the same test would assert a 401-driven error instead.

## Prerequisites

| Tool           | Version | Check                                                                   |
| -------------- | ------- | ----------------------------------------------------------------------- |
| Node.js        | 22.19+  | `node -v` (an older version is refused at install, see `.npmrc`)        |
| Java JDK       | 17+     | `java -version`                                                         |
| Android SDK    | recent  | `adb version` (platform-tools must be on your `PATH`)                   |
| `ANDROID_HOME` | set     | macOS/Linux: `echo $ANDROID_HOME`, PowerShell: `echo $env:ANDROID_HOME` |
| `JAVA_HOME`    | set     | macOS/Linux: `echo $JAVA_HOME`, PowerShell: `echo $env:JAVA_HOME`       |

Appium and the UiAutomator2 driver are **project dependencies**: `npm ci` installs them, no global Appium needed.

The easiest way to get the SDK is Android Studio (SDK Manager → Android SDK Platform-Tools). Typical locations:

**macOS** (add to `~/.zshrc`):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

**Linux**: as above, with `ANDROID_HOME="$HOME/Android/Sdk"` and your JDK path for `JAVA_HOME`.

**Windows** (PowerShell, then open a new terminal):

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
setx PATH "$env:PATH;$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

### Prepare the Android device

1. Settings → About phone → tap **Build number** 7 times to enable Developer options.
2. Developer options → turn on **USB debugging** (and **Stay awake** to keep the screen on while charging).
3. Connect over USB and accept the "Allow USB debugging" prompt on the phone.
4. `adb devices` should list it as `device`, not `unauthorized`.

## Setup

```bash
npm ci                    # exact versions from package-lock.json
npm run app:download      # fetches the APK into ./apps (~120 MB, gitignored)
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run appium:doctor     # checks ANDROID_HOME, JAVA_HOME and adb; fix anything marked required
```

In `.env`, set `ANDROID_UDID` to the serial from `adb devices`. It is optional with exactly one device attached; with several, Appium would otherwise pick the first one adb lists.

## Running the tests

```bash
npm run test:android                                          # all mobile specs on the device
npm run test:android -- --spec mobile/specs/login.spec.ts    # one spec file
npm run test:api                                              # API suite against the public Restful Booker
npm run test:api:report                                       # open the Playwright HTML report
npm run check                                                 # typecheck + lint + format check
```

The first mobile run installs the APK and the UiAutomator2 server on the phone, so allow a couple of minutes. Example API output (abridged):

```
Running 8 tests using 1 worker
  ✓ POST /auth - create token › returns a token for valid credentials
  ✓ POST /auth - create token › the token authorises a protected operation, and the operation is refused without it
  ✓ POST /auth - create token › does not return a token for invalid credentials
  ✓ POST /booking - create booking › returns the created booking matching the request, for a full payload
  ✓ POST /booking - create booking › returns the created booking matching the request, for a payload without the optional additionalneeds field
  ✓ POST /booking - create booking › returns the created booking matching the request, for a payload with the deposit not paid
  ✓ POST /booking - create booking › persists the booking so it can be read back by id
  ✓ POST /booking - create booking › rejects a booking that is missing a required field
  8 passed
```

### Evidence

- `mobile/artifacts/screenshots/`: a `PASS__` screenshot of every test's end state. A failing test or hook gets a `FAIL__` screenshot plus a `.xml` dump of the native view hierarchy for debugging locators. The folder is cleared at the start of each run.
- `mobile/artifacts/logs/`: WebdriverIO worker logs and the Appium server log (`wdio-appium.log`).
- `api/playwright-report/`: the Playwright HTML report, including annotations for the API quirks observed.

## Troubleshooting

| Symptom                                               | Fix                                                                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `adb devices` shows `unauthorized`                    | Developer options → Revoke USB debugging authorisations, reconnect, accept the prompt on the phone.                                           |
| Install fails (e.g. `INSTALL_FAILED_USER_RESTRICTED`) | Xiaomi: enable **Install via USB** in Developer options. Samsung: turn off **Auto Blocker** (Settings → Security and privacy).                |
| `Neither ANDROID_HOME nor ANDROID_SDK_ROOT...`        | Set `ANDROID_HOME` as above and open a new terminal.                                                                                          |
| Port 4723 already in use                              | Another Appium server is running; stop it. This project starts its own.                                                                       |
| Tests time out at the first step                      | Unlock the phone and keep it awake (Developer options → Stay awake).                                                                          |
| Alert step times out on your device                   | Open the alert in [Appium Inspector](https://github.com/appium/appium-inspector) and compare the title's `resource-id` with `NativeAlert.ts`. |
| API global setup fails at `/ping`                     | The public host is down or asleep. Retry, or run Restful Booker locally and set `API_BASE_URL=http://localhost:3001`.                         |

## Project structure

```
mobile/
  config/          wdio.shared.conf.ts (platform-agnostic), wdio.android.conf.ts (capabilities only), app.ts
  src/screens/     Screen objects: AppScreen base, LoginScreen, components/TabBar, components/NativeAlert
  src/helpers/     cross-platform selectors, app restart
  src/data/        test data (users.ts) and the app's exact UI copy (messages.ts)
  specs/           one spec file per feature
api/
  support/         API client, fixtures with automatic cleanup, payload builder, zod schemas, assertions
  tests/           auth.spec.ts, booking.spec.ts
scripts/           download-app.mjs
```

## Design decisions

- **Screen Object Model** with a shared `AppScreen` base. Specs read as user intent; locators live in one place.
- **Accessibility-id locators.** The app derives `accessibilityLabel` (Android) and `testID` (iOS) from the same string, so `~id` works on both. Validation messages have no id and are located by exact text through a platform-aware `byText()`.
- **Independent tests.** Each test kills and relaunches the app (`terminateApp`/`activateApp`) and navigates from Home, so order never matters and nothing leaks between tests.
- **No fixed sleeps.** All waits are condition-based. The one bounded wait proves a negative ("no success alert within 3 s"), sized against the app's simulated 1.5 s request. It returns "no alert" only on its own timeout; any driver error is rethrown, so a broken session can't pass a negative test.
- **Explicit alert handling.** WebdriverIO 10's `acceptDialog()` switches to SpringBoard on iOS (it's built for system permission prompts) and returns silently when no dialog exists, so `NativeAlert` asserts the alert's exact title and message instead.
- **Exact-string assertions** against the app's real copy, so a text change fails a test instead of passing silently.
- **One source of truth for the app version** (`package.json` → `config.appVersion`), shared by the download script and the WebdriverIO config.
- **Playwright for the API part.** WebdriverIO has no built-in HTTP client; Playwright's `APIRequestContext` is first-class. Every response is checked for status and content type before parsing, then validated against a strict zod schema.
- **Leave the shared API tidy.** The `bookings` fixture registers each created booking before any assertion runs and deletes it afterwards, pass or fail, using Basic auth so cleanup never depends on `/auth`, which is itself under test.
- **Lint catches the classic WebdriverIO bug:** type-aware `no-floating-promises` flags a missing `await`, and `mocha/no-exclusive-tests` blocks a stray `it.only`.
- **No retries locally**, so failures stay visible. With `CI` set, the API suite allows one retry for transient network errors on the shared Heroku host.

## API observations

- Invalid credentials return `200 OK` (not `401`) with `{ "reason": "Bad credentials" }`.
- A booking missing a required field returns `500` (a `400` would be expected).
- The server matches `Accept` exactly and returns `418` for values it does not support.
- A successful `DELETE` returns `201`; deleting a booking that doesn't exist returns `405`.
- Stored data is normalised: names are trimmed, prices truncated with `parseInt`, dates reformatted as `YYYY-MM-DD` in the server's time zone. The payload builder sends canonical values so "response equals request" is exact. A server running west of UTC would shift dates back a day, and these tests would report it.
- The public host resets its data periodically and anyone can delete bookings with the published admin credentials, so a test may very rarely see its booking vanish. Cleanup tolerates "already gone".

## Credits

The screen-object layout (an `AppScreen` base keyed on the app's `<Name>-screen` ids, plus `TabBar` and `NativeAlert` components) is adapted from WebdriverIO's [appium-boilerplate](https://github.com/webdriverio/appium-boilerplate). Differences here: WebdriverIO 10 and Appium 3, exact title-and-message alert assertions, error-safe negative waits, keyboard-aware submission, failure evidence with view-hierarchy dumps, and TypeScript strict mode.
