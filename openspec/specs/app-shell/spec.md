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

### Requirement: Theme choice
MTF SHALL offer three themes: System, Light and Dark, with System by default. System SHALL use the light Paper palette when the device prefers a light theme and the dark Paper palette (warm charcoal, not pure black) when it prefers a dark theme. Light and Dark SHALL use that palette whatever the device prefers. Every switch SHALL happen without a reload.

#### Scenario: Dark system theme
- **WHEN** the theme is System and the device is set to a dark theme
- **THEN** MTF shows the dark paper ground and light ink

#### Scenario: System theme changes while open
- **WHEN** the theme is System and the device theme changes from light to dark while MTF is open
- **THEN** MTF switches to the dark palette without a reload

#### Scenario: Dark against a light system
- **WHEN** the device is set to a light theme and the user chooses Dark
- **THEN** MTF shows the dark paper ground and light ink at once, without a reload

#### Scenario: Light against a dark system
- **WHEN** the device is set to a dark theme and the user chooses Light
- **THEN** MTF shows the light paper ground and dark ink at once, without a reload

#### Scenario: A chosen theme ignores the device
- **WHEN** the user has chosen Light and the device theme changes from light to dark while MTF is open
- **THEN** MTF stays on the light palette

#### Scenario: Back to System
- **WHEN** the user has chosen Dark on a device set to a light theme and then chooses System
- **THEN** MTF switches to the light palette without a reload

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
- **THEN** the Settings sheet opens and shows the language setting and the theme setting

#### Scenario: Close with Esc
- **WHEN** the Settings sheet is open and the user presses `Esc`
- **THEN** the sheet closes

#### Scenario: Close by tapping outside
- **WHEN** the Settings sheet is open and the user taps or clicks outside it
- **THEN** the sheet closes

### Requirement: Accent reserved for wins
The app shell SHALL NOT use the accent color for decoration, navigation or settings controls; the accent is reserved for wins. The wins counter in the floating tools is the only shell control that uses it.

#### Scenario: Shell controls
- **WHEN** the base screen and the Settings sheet are shown
- **THEN** no control on them uses the accent color, except the wins counter

#### Scenario: Toasts
- **WHEN** a toast is shown
- **THEN** it uses ink and paper colors, not the accent color

### Requirement: Theme selector
The Settings sheet SHALL offer a theme selector labelled "Tema" / "Theme", with "Sistema · Claro · Oscuro" in Spanish and "System · Light · Dark" in English, that shows which theme is active. Like the other settings controls, it SHALL NOT use the accent color.

#### Scenario: Default selection
- **WHEN** the user opens Settings and has never chosen a theme
- **THEN** the theme selector shows System as active

#### Scenario: English labels
- **WHEN** the UI is in English and the user opens Settings
- **THEN** the theme selector reads "Theme" with "System", "Light" and "Dark"

### Requirement: Theme is remembered
The chosen theme SHALL be remembered on that device and applied as soon as MTF starts on every later launch. A missing or unreadable stored theme SHALL mean System. The theme is a device setting: it SHALL NOT be part of the data document or the Backup, and an Import SHALL leave it as it was.

#### Scenario: Dark survives a reload
- **WHEN** the device is set to a light theme, the user chooses Dark and reloads MTF
- **THEN** MTF opens with the dark palette and the theme selector shows Dark as active

#### Scenario: Unknown stored value
- **WHEN** the stored theme holds a value that is not System, Light or Dark
- **THEN** MTF uses System

#### Scenario: Storage refused
- **WHEN** the browser refuses storage and the user chooses Dark
- **THEN** MTF switches to the dark palette for that session without crashing

### Requirement: Status bar follows the theme
The browser and phone status bar color SHALL match the paper ground of the theme in use: the device's mode under System, and the chosen palette under Light or Dark.

#### Scenario: Dark on a light device
- **WHEN** the device is set to a light theme and the user chooses Dark
- **THEN** the page's theme color is the dark paper color

#### Scenario: Back to System
- **WHEN** the user chooses System again
- **THEN** the page's theme color follows the device's light or dark mode again
