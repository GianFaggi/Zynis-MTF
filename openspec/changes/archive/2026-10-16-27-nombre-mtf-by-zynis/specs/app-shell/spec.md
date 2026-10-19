# Spec Delta

## MODIFIED Requirements

### Requirement: Base paper screen
When MTF opens it SHALL show a full-screen paper ground holding the Desk, with the floating wordmark over it: **MTF** in capitals with a smaller **By Zynis** beside it on the same line, named "MTF By Zynis" as a heading. "By Zynis" SHALL read the same in every language. On wide screens the tagline SHALL follow the wordmark. The screen SHALL have no header bar and no tab bar; controls float on the paper.

#### Scenario: First launch
- **WHEN** the user opens MTF for the first time
- **THEN** the paper ground fills the screen with the Desk on it
- **AND** the wordmark reads "MTF" in capitals with "By Zynis" beside it
- **AND** there is no header bar and no tab bar

#### Scenario: Wordmark in English
- **WHEN** the UI is in English
- **THEN** the wordmark still reads "MTF By Zynis"

#### Scenario: Tagline on wide screens
- **WHEN** MTF is opened on a desktop viewport
- **THEN** the tagline "más tareas fáciles" (or "more easy tasks" in English) follows "By Zynis" on the same line

#### Scenario: Wordmark on a phone
- **WHEN** MTF is opened on a phone-sized viewport
- **THEN** "MTF By Zynis" is visible on one line and the tagline is not shown

#### Scenario: Phone and PC
- **WHEN** MTF is opened on a phone-sized viewport and on a desktop viewport
- **THEN** the screen fits the viewport without page scrolling in both; only the Desk moves
