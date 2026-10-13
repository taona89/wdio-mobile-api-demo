@mobile @swipe
Feature: Swipe and scroll
  As a user of the demo app
  I want to swipe the carousel and scroll the screen
  So that I can reach content that is not on screen to begin with

  Background:
    Given I am on the Swipe screen

  @smoke
  Scenario: Swiping the carousel left moves on to the next card
    Given the carousel shows "FULLY OPEN SOURCE"
    When I swipe the carousel left
    Then the carousel shows "GREAT COMMUNITY"
    And the carousel no longer shows "FULLY OPEN SOURCE"

  Scenario: Scrolling down reveals what the screen hides below the fold
    Given the WebdriverIO logo is not displayed
    When I scroll down to the hidden message
    Then I see the text "You found me!!!"
    And the carousel no longer shows "FULLY OPEN SOURCE"
