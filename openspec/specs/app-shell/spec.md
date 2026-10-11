# app-shell Specification

## Purpose

Defines the screen MTF opens to and its Paper look: the calm paper ground, the bundled fonts, light and dark following the system, and the Settings sheet where app settings live. The Desk is added on top of this shell in a later change.

## Requirements

### Requirement: Base paper screen
When MTF opens it SHALL show a full-screen paper ground holding the Desk, with the floating `mtf` wordmark over it. The screen SHALL have no header bar and no tab bar; controls float on the paper.

#### Scenario: First launch
- **WHEN** the user opens MTF for the first time
- **THEN** the paper ground fills the screen with the Desk on it
- **AND** the `mtf` wordmark is visible
- **AND** there is no header bar and no tab bar

#### Scenario: Phone and PC
- **WHEN** MTF is opened on a phone-sized viewport and on a desktop viewport
- **THEN** the screen fits the viewport without page scrolling in both; only the Desk moves

### Requirement: Theme follows the system
MTF SHALL use the light Paper palette when the system prefers a light theme and the dark Paper palette (warm charcoal, not pure black) when it prefers a dark theme, switching without a reload.

#### Scenario: Dark system theme
- **WHEN** the device is set to a dark theme
- **THEN** MTF shows the dark paper ground and light ink

#### Scenario: System theme changes while open
- **WHEN** the system theme changes from light to dark while MTF is open
- **THEN** MTF switches to the dark palette without a reload

### Requirement: Bundled fonts
MTF SHALL render titles and the wordmark in Literata and all other text in Figtree, served with the app itself and never fetched from a third-party font service.

#### Scenario: Fonts without connection
- **WHEN** MTF is opened offline after a first visit
- **THEN** the wordmark renders in Literata and UI text renders in Figtree

#### Scenario: No third-party font requests
- **WHEN** MTF loads
- **THEN** no request is made to a third-party font host

### Requirement: Settings sheet
A floating settings button with an accessible name SHALL open a Settings sheet over the paper. The sheet SHALL close with a close button, with the `Esc` key, and by tapping or clicking outside it.

#### Scenario: Open settings
- **WHEN** the user activates the settings button
- **THEN** the Settings sheet opens and shows the language setting

#### Scenario: Close with Esc
- **WHEN** the Settings sheet is open and the user presses `Esc`
- **THEN** the sheet closes

#### Scenario: Close by tapping outside
- **WHEN** the Settings sheet is open and the user taps or clicks outside it
- **THEN** the sheet closes

### Requirement: Accent reserved for wins
The app shell SHALL NOT use the accent color for decoration, navigation or settings controls; the accent is reserved for wins.

#### Scenario: Shell controls
- **WHEN** the base screen and the Settings sheet are shown
- **THEN** no control on them uses the accent color
