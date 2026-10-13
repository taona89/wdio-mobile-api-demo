# Mobile & API Test Automation

Automated tests for the [WebdriverIO Native Demo App](https://github.com/webdriverio/native-demo-app) (v2.2.0) with **WebdriverIO 10 + Appium 3 + Cucumber**, and API tests for [Restful Booker](https://restful-booker.herokuapp.com/apidoc/index.html) with **Playwright's built-in request API**.

| Part   | Stack                                                                             | Target                                       |
| ------ | --------------------------------------------------------------------------------- | -------------------------------------------- |
| Mobile | WebdriverIO 10, Appium 3, Cucumber (Gherkin), UiAutomator2 / XCUITest, TypeScript | Android physical device; iOS simulator in CI |
| API    | Playwright Test (`APIRequestContext`), zod schemas, TypeScript                    | `restful-booker.herokuapp.com`               |

The mobile suite is written in BDD: business-readable `.feature` files, thin step definitions, and page objects that locate elements by **accessibility id**, so one set of scenarios drives Android and iOS. No feature or step file mentions a platform; the four places that cannot use an accessibility id are listed below.

## Requirement coverage

| Brief requirement                         | Covered by                                                  | Status | Notes                                                               |
| ----------------------------------------- | ----------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| 1. Signup                                 | `mobile/features/signup.feature`                            | Done   | Plus a negative case: confirmation password does not match          |
| 2. Login, happy path                      | `login.feature` › Logging in with valid credentials         | Done   |                                                                     |
| 3. Login, invalid credentials             | `login.feature` › Scenario Outline                          | Done   | **Deviation, see below**                                            |
| 4. Form interaction                       | `mobile/features/forms.feature`                             | Done   | Input echo, switch toggle, active and inactive buttons              |
| 5. Swipe / scroll                         | `mobile/features/swipe.feature`                             | Done   | Horizontal carousel paging, and a vertical scroll to hidden content |
| 6. Bonus scenario                         | `login.feature` › `@finding`, and the `@validation` outline | Done   | A characterisation scenario that records a real finding             |
| Bonus: both platforms, shared test logic  | `wdio.android.conf.ts`, `wdio.ios.conf.ts`, `ios.yml`       | Done   | The same 12 scenarios pass on an Android phone and an iOS simulator |
| API 1. Auth: token returned               | `api/tests/auth.spec.ts`                                    | Done   | Also proves the token authorises a protected operation              |
| API 2. Create booking: response = request | `api/tests/booking.spec.ts`                                 | Done   | Three payload variants, a read-back, and a negative case            |

12 scenarios, 44 steps, 21 step definitions - all passing on a physical Android device and on an iOS simulator.

### Verification status

The whole suite has been run end to end on a physical Android device (Samsung, Android 1440x2707, Node 22.23.2, Appium 3, build-tools 37.0.0), and on an iOS simulator (iPhone 16e, iOS 18.5) on a GitHub Actions macOS runner, because there is no Mac among the development machines.

| Check                                                 | How                                                                        | Result                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| **Mobile suite on a real device**                     | `npm run test:android`                                                     | **4 features, 12 scenarios, all passing** |
| **Mobile suite on an iOS simulator**                  | `npm run test:ios`, run by `.github/workflows/ios.yml`                     | **4 features, 12 scenarios, all passing** |
| **API suite**                                         | `npm run test:api`                                                         | **8 passing**                             |
| Evidence capture                                      | Same run                                                                   | 12 `PASS__` screenshots, 0 failures       |
| Both TypeScript projects compile under `strict`       | `npm run typecheck`                                                        | Pass                                      |
| Lint, including type-aware `no-floating-promises`     | `npm run lint`                                                             | Pass                                      |
| Formatting                                            | `npm run format:check`                                                     | Pass                                      |
| Every Gherkin step resolves to exactly one definition | Features compiled to pickles and matched against the real step expressions | 44/44, 0 undefined, 0 ambiguous, 0 unused |
| `npm ci` reproduces from the lockfile                 | `npm ci` with `engine-strict` active                                       | Pass                                      |
| The ordered `onPrepare` guard fires first             | A run with no APK present                                                  | `SevereServiceError: App not found ...`   |

Two things the device run taught us, both now fixed in the code rather than just noted:

- **A coordinate swipe does not scroll the Swipe screen.** The carousel's container fills most of the viewport, so a drag starting at 75% of screen height begins _inside_ it and reanimated-carousel swallows the vertical gesture - the page did not move at all. Page scrolling now drives the scrollable container (`AppPage.scrollTo`), and coordinate swipes are reserved for gestures that must land on a specific widget, such as paging the carousel. See the note on `AppPage.scrollTo`.
- **Appium's first cold start exceeds the service's 30 s default.** `@wdio/appium-service` waits for Appium to print `Appium REST http interface listener started`; on timeout it throws from `onPrepare`, which WebdriverIO logs before carrying on, so workers then race a server that is not listening and fail with `Unable to connect to "http://127.0.0.1:4723/"`. `appiumStartTimeout` is raised to 120 s.

Three things the iOS run taught us. The first run passed only the Forms feature; no feature or step file had to change to fix the rest:

- **React Native renders a `Text` as two nested `StaticText`s on iOS**, both with the same label, so every lookup by text matched twice and WebdriverIO 10's strict selectors rejected it. `byText()` now restricts the iOS lookup to the one that is an accessibility element.
- **iOS offers an "Automatic Strong Password" on the sign-up form.** It replaces the keyboard and discards what the test types, so the form was submitted with empty passwords. This is a simulator setting, not something a selector can fix: the workflow boots the simulator with password AutoFill turned off (see `ios.yml`). A local simulator needs the same.
- **Nothing on the Login form dismisses the iOS keyboard without side effects.** The keyboard's Done key submits the form, and the form's heading, the one inert place to tap, is pushed under the status bar while the keyboard is open. The keyboard is therefore left up on iOS; the form sits in a `KeyboardAvoidingView`, so the button and the validation messages stay visible above it.

Still **not** verified:

- A **physical iPhone**. The iOS run is a simulator build on a simulator; a real device needs a signed build and a provisioning profile.
- An iOS run on a **local Mac**. The config has only been run on the CI runner.

Every locator in the suite was taken from the app's source at tag `v2.2.0` rather than guessed: `src/config/TestProperties.ts`, `src/components/Button.tsx`, `src/components/LoginForm.tsx`, `src/components/FormComponents.tsx`, `src/components/SliderEntry.tsx`, `src/screens/Swipe.tsx`, `src/components/CustomBottomTabBar.tsx` and `app/(tabs)/_layout.tsx`.

### Deviation: "wrong password" on an app with no backend

The demo app has no server. `src/components/LoginForm.tsx` only checks that the email is well formed and the password has at least 8 characters; anything that passes gets the success alert. So the app cannot know a password is "wrong" unless it breaks that rule. The suite therefore:

- **rejects a wrong password** one character below the minimum, asserting the exact error "Please enter at least 8 characters" and that no success alert follows;
- **rejects a malformed email**, asserting its error message;
- **records a finding** in the `@finding` scenario: a well-formed but wrong 8-character password logs in. This characterisation scenario passes today and would fail the moment real credential checking is added. In a team setting this goes to the product owner; against a real backend, the same scenario would assert a 401-driven error instead.

## How the BDD layer is organised

| Convention   | Means                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `*.feature`  | Gherkin specification, one file per feature, tagged `@mobile` plus a feature tag                                     |
| `*.page.ts`  | One page object per screen or component, default-exporting a singleton                                               |
| `*.steps.ts` | Step definitions. One file per feature, plus `alert`, `validation` and `navigation` for steps shared across features |
| `support/`   | Cucumber hooks, and the cross-platform selector, gesture and keyboard helpers                                        |
| `data/`      | Test data, and the app's exact UI copy                                                                               |

Rules the suite follows, which are worth knowing before adding to it:

- **Steps stay thin.** A step definition names an intent and delegates; all element knowledge lives in a page object. No step contains a selector.
- **Scenario state would go on a Cucumber World**, never on a page object: page objects are singletons shared by the whole run, so a value parked on one leaks into the next scenario. No scenario currently needs to carry state between steps, so there is no World — if you add one, declare those steps `async function (this: MyWorld)`, because an arrow function captures the module scope and never receives the World.
- **Setup is a hook, not a step.** `support/hooks.ts` relaunches the app before every scenario, so isolation cannot be forgotten when someone adds a feature file, and the Background stays business-readable.
- **`strict: true`.** An undefined or pending step fails the run instead of being reported as skipped. This replaces the guard `mocha/no-exclusive-tests` gave the old spec files: without it, a feature file can describe behaviour nobody implemented and still come out green. `failAmbiguousDefinitions` is on for the same reason.
- **Copy lives in one place per kind.** Alerts are two-part (title and message), so feature files name them (`the "login success" alert is shown`) and `data/messages.ts` resolves the name. Single-line copy, such as a validation message, is written in the feature file, because that text _is_ the specification — and the step checks the expected string against the app's known copy first, so a typo in a feature fails immediately instead of waiting out a locator timeout.

## Element recognition: accessibility ids

The app's `testProperties()` helper (`src/config/TestProperties.ts`) sets the **same** string as `accessibilityLabel` on Android and `testID` on iOS:

```ts
IS_IOS ? { testID: id } : { accessibilityLabel: id };
```

Appium maps both to the accessibility id, so `~id` resolves identically on UiAutomator2 and XCUITest. Every page object goes through `byId()` in `support/selectors.ts`, and no page object branches on platform for element lookup.

Every element the app itself labels is found this way, on both platforms, with no branch. Four places are not, and each is isolated and documented where it is defined.

**Located by text, because the app renders no id for them:**

| Exception                                                     | Why                                                                                                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form validation messages                                      | They are the `errorMessage` prop of react-native-elements' `Input`, which renders its own `Text` with no `testID` or `accessibilityLabel`, so there is nothing to target but the copy.       |
| Carousel card titles, and the hidden copy on the Swipe screen | `SliderEntry` labels all six cards `card`, so they are indistinguishable by id. The title is the only per-card signal; it is rendered `title.toUpperCase()`, hence the upper-case constants. |

`byText()` is itself platform-aware (`UiSelector().text()` on Android, an `-ios predicate string` on iOS), so these run on both platforms unchanged. Every string asserted through it is checked against the app's known copy first, so a typo in a feature file fails immediately instead of waiting out the locator timeout.

**Platform-specific, because the element is not the app's to label:**

| Exception       | Why                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tab bar, on iOS | The accessibility id is correct on both platforms, but WebDriverAgent matches an id against a node's name _or_ label, and the Login form renders its own "Login" text. The iOS lookup is scoped to a button so the match stays unique under WebdriverIO 10's strict selectors.       |
| Native alerts   | `Alert.alert` is drawn by the platform, not by the app, so there is no React component to put a `testID` on. Android exposes framework resource-ids; iOS exposes `XCUIElementTypeAlert` and scopes button lookups the same way the tab bar does. Both are stable platform contracts. |

## Prerequisites

| Tool           | Version | Check                                                                   |
| -------------- | ------- | ----------------------------------------------------------------------- |
| Node.js        | 22.19+  | `node -v` (an older version is refused at install, see `.npmrc`)        |
| Java JDK       | 17+     | `java -version`                                                         |
| Android SDK    | recent  | `adb version` (platform-tools must be on your `PATH`)                   |
| Build Tools    | any     | `$ANDROID_HOME/build-tools/<ver>/aapt2.exe` must exist                  |
| `ANDROID_HOME` | set     | macOS/Linux: `echo $ANDROID_HOME`, PowerShell: `echo $env:ANDROID_HOME` |
| `JAVA_HOME`    | set     | macOS/Linux: `echo $JAVA_HOME`, PowerShell: `echo $env:JAVA_HOME`       |

The Node floor is not cosmetic: WebdriverIO 10 fails at startup on anything below 22.12. Use `nvm use` (see `.nvmrc`) if your default is older.

**platform-tools on its own is not enough.** `adb version` can succeed while the run still fails with `Could not find 'aapt2.exe' ... Do you have Android Build Tools installed?`. Appium's UiAutomator2 driver shells out to `aapt2` to inspect the APK, because the config passes `appium:app`. `ANDROID_HOME` must therefore point at an SDK root containing **both** `platform-tools/` and `build-tools/<version>/`, not at a platform-tools-only directory. The leanest way there without Android Studio:

```bash
# unpack Google's command-line tools into $ANDROID_HOME/cmdline-tools/latest, then:
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "build-tools;37.0.0"
```

On a JDK whose version string is a bare major ("18", say) `sdkmanager` can misparse its own version check and refuse to start with "Java version 17 or higher is required" even though the JDK qualifies. `SKIP_JDK_VERSION_CHECK=1` gets past it.

Appium and the UiAutomator2 driver are **project dependencies**: `npm ci` installs them, no global Appium needed. The iOS driver is not, so that `npm ci` stays light on Android-only machines — install it with `npx appium driver install xcuitest` when you need it.

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
npm run test:android                                   # all mobile features on the device
npm run test:android -- --spec mobile/features/login.feature   # one feature file
npm run test:android -- --cucumberOpts.tags "@smoke"   # one tag
npm run test:android -- --cucumberOpts.tags "@forms or @swipe"
npm run test:api                                       # API suite against the public Restful Booker
npm run test:api:report                                # open the Playwright HTML report
npm run check                                          # typecheck + lint + format check
```

Tags available: `@mobile` on every feature, then `@login`, `@signup`, `@forms`, `@swipe`, and `@smoke`, `@validation`, `@finding` on individual scenarios.

For iOS, on macOS with Xcode:

```bash
npx appium driver install xcuitest
npm run app:download:ios          # fetches the simulator .zip into ./apps
npm run test:ios                  # override IOS_DEVICE_NAME / IOS_PLATFORM_VERSION in .env
```

Turn off password AutoFill on the simulator first, or the sign-up scenarios fail (see "Verification status"). Without a Mac, `.github/workflows/ios.yml` does all of the above on a GitHub Actions macOS runner: it runs on every push to `main` or `ios-ci`, and on demand. It uploads the run's evidence as the `ios-artifacts` artifact and also publishes it to the `ci-ios-results` branch, so the Allure results can be fetched with plain git and merged into the combined report below.

### Reports

Both suites write [Allure](https://allurereport.org/) results, and one report covers everything:

```bash
npm run report                # Mobile (Android and iOS) and API in one report
npm run test:mobile:report    # mobile only
npm run test:api:allure       # API only
```

Each command builds the report from the results of the most recent runs and opens it; rendering needs Java. The combined report groups tests as `Mobile > Android > <feature>`, `Mobile > iOS > <feature>` and `API > <spec file>`. Each platform writes to its own directory (`mobile/artifacts/allure-results/android` and `.../ios`), so one platform's run never clears the other's results. To include a CI iOS run, copy `allure-results/ios` from the `ci-ios-results` branch into `mobile/artifacts/allure-results/ios`.

The first mobile run installs the app and the UiAutomator2 server on the phone, so allow a couple of minutes. Example API output (abridged):

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

- `mobile/artifacts/screenshots/`: a `PASS__` screenshot of every scenario's end state. A failing step gets a `FAIL__` screenshot plus a `.xml` dump of the native view hierarchy, which is what you actually need to debug a locator — a PNG cannot tell you an element's `resource-id` or whether it was merely not displayed. The folder is cleared at the start of each run.
- `mobile/artifacts/logs/`: WebdriverIO worker logs and the Appium server log (`wdio-appium.log`). This directory is deliberately **not** cleared: WebdriverIO opens its log file here when the launcher starts, so removing it would pull an open handle out from under it.
- `mobile/artifacts/allure-results/<platform>/` and `api/allure-results/`: the Allure results behind `npm run report`, cleared at the start of each run of that platform or suite.
- `api/playwright-report/`: the Playwright HTML report, including annotations for the API quirks observed.

A scenario that dies in the `Before` hook never reaches a step, so `afterScenario` captures that case too, and skips it when a step already captured the failure.

## Troubleshooting

| Symptom                                               | Fix                                                                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` fails with `EBADENGINE`                      | Your Node is older than 22.19. This is intentional; upgrade rather than bypass, because WebdriverIO 10 cannot start on it.                          |
| `webidl.util.markAsUncloneable is not a function`     | Same cause: Node below 22.12. Upgrade Node.                                                                                                         |
| Every step reports as undefined                       | A step file is not being loaded. `cucumberOpts.import` lists files explicitly for a reason — see "Design decisions".                                |
| `adb devices` shows `unauthorized`                    | Developer options → Revoke USB debugging authorisations, reconnect, accept the prompt on the phone.                                                 |
| Install fails (e.g. `INSTALL_FAILED_USER_RESTRICTED`) | Xiaomi: enable **Install via USB** in Developer options. Samsung: turn off **Auto Blocker** (Settings → Security and privacy).                      |
| `Neither ANDROID_HOME nor ANDROID_SDK_ROOT...`        | Set `ANDROID_HOME` as above and open a new terminal.                                                                                                |
| `Could not find 'aapt2.exe'`                          | `ANDROID_HOME` has no `build-tools/`. Install it with `sdkmanager "build-tools;37.0.0"` - see Prerequisites.                                        |
| `Unable to connect to "http://127.0.0.1:4723/"`       | The Appium server was not listening yet. Raise `appiumStartTimeout` in the service options; the 30 s default is short for a first cold start.       |
| `sdkmanager` demands Java 17+ on a newer JDK          | Its version check misparses a bare major version. Set `SKIP_JDK_VERSION_CHECK=1`.                                                                   |
| Port 4723 already in use                              | Another Appium server is running; stop it. This project starts its own.                                                                             |
| Tests time out at the first step                      | Unlock the phone and keep it awake (Developer options → Stay awake).                                                                                |
| Alert step times out on your device                   | Open the alert in [Appium Inspector](https://github.com/appium/appium-inspector) and compare the title's `resource-id` with `native-alert.page.ts`. |
| iOS sign-up submits empty, yellow password fields     | "Automatic Strong Password" took over the fields. Turn off password AutoFill on the simulator, as `.github/workflows/ios.yml` does.                 |
| API global setup fails at `/ping`                     | The public host is down or asleep. Retry, or run Restful Booker locally and set `API_BASE_URL=http://localhost:3001`.                               |

## Project structure

```
mobile/
  features/        login.feature, signup.feature, forms.feature, swipe.feature
  steps/           navigation, login, signup, forms, swipe, alert, validation  (*.steps.ts)
  pages/           app.page.ts (base), login, forms, swipe, tab-bar, native-alert  (*.page.ts)
  support/         hooks.ts, selectors.ts, gestures.ts, keyboard.ts, app.ts
  data/            users.ts (test data), messages.ts (the app's exact UI copy)
  config/          wdio.shared.conf.ts (platform-agnostic), wdio.android.conf.ts,
                   wdio.ios.conf.ts (capabilities only), app.ts
api/
  support/         API client, fixtures with automatic cleanup, payload builder, zod schemas, assertions
  tests/           auth.spec.ts, booking.spec.ts
scripts/           download-app.mjs  (android | ios)
.github/workflows/ ios.yml  (the iOS suite on a macOS runner)
```

## Design decisions

- **Page Object Model under Cucumber**, with a shared `AppPage` base keyed on each screen's `<Name>-screen` accessibility id. Features read as user intent; steps delegate; locators live in one place.
- **Accessibility-id locators everywhere they exist**, which is what makes one set of features drive two platforms. The four documented exceptions are above.
- **Independent scenarios.** A `Before` hook kills and relaunches the app (`terminateApp`/`activateApp`) and every page navigates from Home, so order never matters and nothing leaks between scenarios.
- **No fixed sleeps.** All waits are condition-based, and assertions use expect-webdriverio's retrying matchers (`toHaveText`, `toBeDisplayed`) rather than reading a value once and racing a re-render. The one bounded wait proves a negative ("no alert within 3 s"), sized against the app's simulated 1.5 s request. It returns "no alert" only on its own timeout; any driver error is rethrown, so a broken session cannot pass a negative scenario.
- **Two scroll mechanisms, deliberately.** A gesture that must land on a particular widget uses W3C pointer actions (not the deprecated `touchAction` API), so the same helper drives UiAutomator2 and XCUITest - the carousel swipe starts inside the carousel's own box for this reason. Scrolling a whole screen instead drives the scrollable container through `scrollIntoView`, because a coordinate drag is swallowed by any child that handles its own gestures. Getting this backwards is why the Swipe screen originally would not scroll at all.
- **Explicit alert handling.** WebdriverIO 10's `acceptDialog()` switches to SpringBoard on iOS (it is built for system permission prompts) and returns silently when no dialog exists, so `NativeAlertPage` asserts the alert's exact title and message instead.
- **Exact-string assertions** against the app's real copy, so a text change fails a scenario instead of passing silently.
- **Step files are listed explicitly in `cucumberOpts.import`, not globbed.** On Windows, `@wdio/cucumber-framework` converts each entry to a `file://` URL _before_ testing it for glob characters, so `steps/*.steps.ts` becomes `file:///C:/.../steps/*.steps.ts`, which the glob matcher cannot resolve. It matches nothing, and every step then reports as undefined with no explanation. Explicit paths behave identically on Windows, macOS and Linux, and they make the load order deterministic.
- **One source of truth for the app version** (`package.json` → `config.appVersion`), shared by the download script and both WebdriverIO configs.
- **Ordered `onPrepare`.** The missing-app guard runs before the screenshot directory is cleared, so a forgotten `npm run app:download` does not cost you the previous run's evidence. It throws `SevereServiceError`, because WebdriverIO logs any other error thrown in `onPrepare` and carries on.
- **The Forms dropdown is deliberately out of scope.** `RNPickerSelect` is configured with `useNativeAndroidPickerStyle={false}`, so Android renders a modal list while iOS renders a picker wheel with a Done button. Driving both needs two genuinely different interactions, and the iOS one can only be exercised through the CI simulator, one twenty-minute run at a time; a half-tested platform branch is worse than a documented omission.
- **Playwright for the API part.** WebdriverIO has no built-in HTTP client; Playwright's `APIRequestContext` is first-class. The API suite stays spec-style rather than Gherkin: its fixture-based cleanup, zod validation and HTML report are worth more here than a shared vocabulary with the mobile features, and nothing about `POST /booking` benefits from being readable by a non-engineer.
- **Leave the shared API tidy.** The `bookings` fixture registers each created booking before any assertion runs and deletes it afterwards, pass or fail, using Basic auth so cleanup never depends on `/auth`, which is itself under test.
- **Lint catches the classic WebdriverIO bug:** type-aware `no-floating-promises` flags a missing `await`.
- **No retries locally**, so failures stay visible. With `CI` set, the API suite allows one retry for transient network errors on the shared Heroku host.

## API observations

- Invalid credentials return `200 OK` (not `401`) with `{ "reason": "Bad credentials" }`.
- A booking missing a required field returns `500` (a `400` would be expected).
- The server matches `Accept` exactly and returns `418` for values it does not support.
- A successful `DELETE` returns `201`; deleting a booking that doesn't exist returns `405`.
- Stored data is normalised: names are trimmed, prices truncated with `parseInt`, dates reformatted as `YYYY-MM-DD` in the server's time zone. The payload builder sends canonical values so "response equals request" is exact. A server running west of UTC would shift dates back a day, and these tests would report it.
- The public host resets its data periodically and anyone can delete bookings with the published admin credentials, so a test may very rarely see its booking vanish. Cleanup tolerates "already gone".

## Credits

The page-object layout (an `AppPage` base keyed on the app's `<Name>-screen` ids, plus `TabBar` and `NativeAlert` components) is adapted from WebdriverIO's [appium-boilerplate](https://github.com/webdriverio/appium-boilerplate). Differences here: WebdriverIO 10 and Appium 3, a Cucumber BDD layer, exact title-and-message alert assertions, error-safe negative waits, keyboard-aware submission, W3C pointer gestures, failure evidence with view-hierarchy dumps, and TypeScript strict mode.
