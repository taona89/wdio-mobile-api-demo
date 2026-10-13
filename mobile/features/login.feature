@mobile @login
Feature: Login
  As a user of the demo app
  I want to sign in from the Login tab
  So that I can reach the parts of the app that need an account

  Background:
    Given I am on the login form

  @smoke
  Scenario: Logging in with valid credentials
    When I log in with valid credentials
    Then the "login success" alert is shown

  # The app has no backend. LoginForm.tsx checks only that the email matches its regex and that
  # the password is at least 8 characters, so these are the only inputs it is able to reject.
  # See README, "Requirement coverage", for why that is reported rather than worked around.
  @validation
  Scenario Outline: The form rejects <case>
    When I log in with email "<email>" and password "<password>"
    Then I see the validation message "<message>"
    And no alert appears within 3 seconds

    Examples:
      | case                             | email                | password    | message                            |
      | a password one character too short | qa.login@example.com | aaaaaaa     | Please enter at least 8 characters  |
      | a malformed email address        | not-an-email         | Str0ngPass! | Please enter a valid email address  |

  # Characterisation scenario: 8 characters exactly, and not this user's password, yet it logs in.
  # It passes today and will fail the moment real credential checking is added, which is the point.
  # It also covers the valid side of the 8-character boundary.
  @finding
  Scenario: Any well-formed password is accepted, because the app checks no credentials
    When I log in with email "qa.login@example.com" and password "Wrong123"
    Then the "login success" alert is shown
