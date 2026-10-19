# pwa-offline Specification

## Purpose

Makes MTF an installable app that opens with no connection, on phone and PC. It defines what is available offline and how new versions arrive.

## Requirements

### Requirement: Installable app
MTF SHALL provide a web app manifest with name "MTF By Zynis", short name "MTF By Zynis", standalone display, any orientation, paper-colored theme and background, and icons at 192 px, 512 px and maskable 512 px, plus a 180 px Apple touch icon, so browsers offer to install it. The page title and the iPhone home-screen title SHALL also be "MTF By Zynis".

#### Scenario: Install offered
- **WHEN** MTF is opened over HTTPS in a browser that supports installing web apps
- **THEN** the browser treats MTF as installable

#### Scenario: Opens standalone
- **WHEN** the installed MTF is launched from the home screen or the PC
- **THEN** it opens in its own window without browser address bar

#### Scenario: Name in the browser tab
- **WHEN** MTF is opened in a browser tab
- **THEN** the tab reads "MTF By Zynis"

#### Scenario: Name under the icon
- **WHEN** MTF is installed on a phone's home screen
- **THEN** the label under its icon reads "MTF By Zynis"

### Requirement: Opens offline after first visit
After MTF has been opened once with a connection, it SHALL open and show the base paper screen with no connection, including bundled fonts and icons.

#### Scenario: Reload offline
- **WHEN** MTF has been visited once and the device goes offline
- **AND** the user reloads or relaunches MTF
- **THEN** the base paper screen appears with its fonts

#### Scenario: Data available offline
- **WHEN** the user changed the language while online and then opens MTF offline
- **THEN** MTF shows the language they chose

### Requirement: No network needed at runtime
MTF SHALL NOT need any network request to work once loaded; it makes no requests to external hosts.

#### Scenario: External requests
- **WHEN** MTF loads and the user opens Settings and switches language
- **THEN** no request leaves the MTF origin

### Requirement: Silent updates
When a new version of MTF is deployed, it SHALL be downloaded in the background and SHALL take effect on a later launch without asking the user anything and without losing their data.

#### Scenario: New version deployed
- **WHEN** a new version is deployed while the user has MTF open
- **THEN** the user is not interrupted
- **AND** a later launch runs the new version with the same data

### Requirement: Install guidance in Settings
The Settings sheet SHALL show an "Instalar la app" / "Install the app" section that explains, in the current language, that an installed MTF opens like an app and keeps the notes safer (on iPhone, Safari can erase data of sites not opened for a while, but not of installed apps). None of its controls SHALL use the accent color.

#### Scenario: Section shown
- **WHEN** the user opens Settings
- **THEN** the install section explains why installing helps keep the notes

### Requirement: Install steps match the device
The install section SHALL show what fits the device: a short "installed" line with no steps when MTF already runs installed; the Share → Add to Home Screen steps on iPhone and iPad; an "Instalar MTF" / "Install MTF" button that opens the browser's install dialog when the browser offers installing MTF; generic steps to find the install option in the browser menu anywhere else.

#### Scenario: iPhone in Safari
- **WHEN** the user opens Settings in Safari on an iPhone, with MTF not installed
- **THEN** the install section shows the Share → Add to Home Screen steps

#### Scenario: Browser offers installation
- **WHEN** the user opens Settings in a browser that offers to install MTF
- **THEN** the install section shows an "Instalar MTF" button
- **AND** activating it opens the browser's install dialog

#### Scenario: Installed after the dialog
- **WHEN** the user accepts the browser's install dialog
- **THEN** the install section says MTF is installed

#### Scenario: Already installed
- **WHEN** the user opens Settings in MTF launched from the home screen
- **THEN** the install section says MTF is installed and shows no steps

#### Scenario: Other browsers
- **WHEN** the browser is not on iOS and does not offer installing MTF
- **THEN** the install section shows generic steps to look for the install option in the browser menu

### Requirement: One-time install nudge
When the user keeps a new Card in a session where MTF is not installed and the device can install it (iPhone/iPad, or a browser that offers installing), MTF SHALL show a short, positive nudge to install MTF, with a button that opens Settings and a button to dismiss it. Placing a Welcome Card SHALL NOT trigger it, since the user did not write it.

#### Scenario: First kept Card on an iPhone
- **WHEN** the user, in Safari on an iPhone with MTF not installed, keeps a new Card for the first time
- **THEN** the install nudge appears

#### Scenario: Open the guide
- **WHEN** the nudge is shown and the user activates its "Cómo" button
- **THEN** Settings opens with the install section

#### Scenario: Installed app
- **WHEN** MTF runs installed and the user keeps a new Card
- **THEN** no install nudge appears

#### Scenario: Browser that cannot install
- **WHEN** the browser is not on iOS and does not offer installing MTF
- **THEN** no install nudge appears

#### Scenario: Welcome Card
- **WHEN** MTF places a Welcome Card in Safari on an iPhone with MTF not installed
- **THEN** no install nudge appears

### Requirement: The nudge shows once per device
The install nudge SHALL appear at most once per device: activating either of its buttons, or installing MTF, SHALL prevent it from showing again, also after a reload.

#### Scenario: Dismiss
- **WHEN** the user dismisses the nudge
- **THEN** it does not appear again on this device, even after keeping more Cards or reloading

#### Scenario: After opening the guide
- **WHEN** the user opened Settings from the nudge
- **THEN** the nudge does not appear again on this device
