# Spec Delta

## MODIFIED Requirements

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
