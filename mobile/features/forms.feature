@mobile @forms
Feature: Form components
  As a user of the demo app
  I want the native form controls to respond to my input
  So that I can trust what the form reports back to me

  Background:
    Given I am on the Forms screen

  @smoke
  Scenario: The input field echoes what I type
    When I type "WebdriverIO rocks" into the input field
    Then the input field result reads "WebdriverIO rocks"

  Scenario: Toggling the switch flips its label
    Given the switch label reads "Click to turn the switch ON"
    When I toggle the switch
    Then the switch label reads "Click to turn the switch OFF"

  Scenario: The active button raises an alert
    When I tap the "Active" button
    Then the "active button" alert is shown

  Scenario: The inactive button does nothing
    When I tap the "Inactive" button
    Then no alert appears within 3 seconds
