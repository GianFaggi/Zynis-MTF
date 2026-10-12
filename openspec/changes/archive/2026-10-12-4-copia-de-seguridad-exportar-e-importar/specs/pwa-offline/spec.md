## ADDED Requirements

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
When the user keeps a new Card in a session where MTF is not installed and the device can install it (iPhone/iPad, or a browser that offers installing), MTF SHALL show a short, positive nudge to install MTF, with a button that opens Settings and a button to dismiss it. It SHALL NOT appear while the first-run hint is still shown.

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

### Requirement: The nudge shows once per device
The install nudge SHALL appear at most once per device: activating either of its buttons, or installing MTF, SHALL prevent it from showing again, also after a reload.

#### Scenario: Dismiss
- **WHEN** the user dismisses the nudge
- **THEN** it does not appear again on this device, even after keeping more Cards or reloading

#### Scenario: After opening the guide
- **WHEN** the user opened Settings from the nudge
- **THEN** the nudge does not appear again on this device
