# Spec Delta

## MODIFIED Requirements

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
