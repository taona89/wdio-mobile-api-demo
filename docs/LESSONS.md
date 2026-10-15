# Lessons from the runs

What running the suite on a physical Android device and on an iOS simulator in CI taught us. Each one was fixed in the code rather than just noted, and the fix is documented where it lives.

## Android: the first device run

- **A coordinate swipe does not scroll the Swipe screen.** The carousel's container fills most of the viewport, so a drag starting at 75% of screen height begins _inside_ it and reanimated-carousel swallows the vertical gesture - the page did not move at all. Page scrolling now drives the scrollable container (`AppPage.scrollTo`), and coordinate swipes are reserved for gestures that must land on a specific widget, such as paging the carousel. See the note on `AppPage.scrollTo`.
- **Appium's first cold start exceeds the service's 30 s default.** `@wdio/appium-service` waits for Appium to print `Appium REST http interface listener started`; on timeout it throws from `onPrepare`, which WebdriverIO logs before carrying on, so workers then race a server that is not listening and fail with `Unable to connect to "http://127.0.0.1:4723/"`. `appiumStartTimeout` is raised to 120 s.

## iOS: the first CI runs

The first run passed only the Forms feature. No feature or step file had to change to fix the rest:

- **React Native renders a `Text` as two nested `StaticText`s on iOS**, both with the same label, so every lookup by text matched twice and WebdriverIO 10's strict selectors rejected it. `byText()` now restricts the iOS lookup to the one that is an accessibility element.
- **iOS offers an "Automatic Strong Password" on the sign-up form.** It replaces the keyboard and discards what the test types, so the form was submitted with empty passwords. This is a simulator setting, not something a selector can fix: the workflow boots the simulator with password AutoFill turned off (see `.github/workflows/ios.yml`). A local simulator needs the same.
- **Nothing on the Login form dismisses the iOS keyboard without side effects.** The keyboard's Done key submits the form, and the form's heading, the one inert place to tap, is pushed under the status bar while the keyboard is open. The keyboard is therefore left up on iOS; the form sits in a `KeyboardAvoidingView`, so the button and the validation messages stay visible above it.

## iOS: a run that failed on a commit that had already passed

- **Creating the first iOS session on a CI runner takes about ten minutes**, because resetting the simulator, installing the app and compiling WebDriverAgent all happen inside that one request. That is Appium's default limit on a single request (600 s). The passing runs had finished seconds inside it; the failing one overran, so Appium closed the connection, WebdriverIO opened a second session, and the abandoned first one carried on against the same simulator. Appium's limit (`keepAliveTimeout`) and the client's (`connectionRetryTimeout`) are now well above it.
- **`activateApp` can report success for an app that is not running.** Every lookup then finds nothing, and the scenario fails thirty seconds later with the home screen in its screenshot. `restartApp` now checks the app's real state after terminating and after launching, and launches again if the app is not in the foreground.
