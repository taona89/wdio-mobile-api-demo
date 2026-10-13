@mobile @signup
Feature: Sign up
  As a new user of the demo app
  I want to create an account from the Login tab
  So that I can sign in afterwards

  Background:
    Given I am on the sign up form

  @smoke
  Scenario: Creating an account with valid details
    When I sign up with a new account
    Then the "sign up success" alert is shown

  Scenario: The form rejects a confirmation password that does not match
    When I sign up with a new account but confirm a different password
    Then I see the validation message "Please enter the same password"
    And no alert appears within 3 seconds
