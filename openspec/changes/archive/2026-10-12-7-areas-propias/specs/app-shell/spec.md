# Spec Delta

## MODIFIED Requirements

### Requirement: Settings sheet
A floating settings button with an accessible name SHALL open a Settings sheet over the paper. The sheet SHALL close with a close button, with the `Esc` key, and by tapping or clicking outside it.

#### Scenario: Open settings
- **WHEN** the user activates the settings button
- **THEN** the Settings sheet opens and shows the language setting, the theme setting and the Areas section

#### Scenario: Close with Esc
- **WHEN** the Settings sheet is open and the user presses `Esc`
- **THEN** the sheet closes

#### Scenario: Close by tapping outside
- **WHEN** the Settings sheet is open and the user taps or clicks outside it
- **THEN** the sheet closes
