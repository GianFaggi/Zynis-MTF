# Spec Delta

## Purpose

Defines the Welcome Card: the Card MTF places on a device's first launch to teach the core loop by doing it (drag a Card, check its Items, drop it in the Jar), and how the user brings it back from Settings.

## ADDED Requirements

### Requirement: Welcome Card on first launch
On a device's first launch, MTF SHALL place a Welcome Card in the first Area, on top of every other Card. It SHALL have a title, a short line of text and a checklist of three unchecked Items: drag the Card somewhere else (holding it first on a phone), check an Item, and check everything and drop the Card in the Jar.

#### Scenario: First launch
- **WHEN** MTF opens for the first time on a device
- **THEN** a Card with a title, a line of text and three unchecked Items is on the Desk, in the first Area and on top of the other Cards

#### Scenario: Kept across reloads
- **WHEN** the user reloads MTF after the first launch without touching the Welcome Card
- **THEN** the same Welcome Card is still on the Desk and no second one is placed

### Requirement: Welcome Card in the current language
The Welcome Card SHALL be written in the UI language at the moment it is placed. Once placed, its text SHALL NOT change when the user switches the language.

#### Scenario: English device
- **WHEN** MTF opens for the first time on a device whose browser prefers English
- **THEN** the Welcome Card's title, text and Items are in English

#### Scenario: Language switched afterwards
- **WHEN** the Welcome Card was placed in Spanish and the user switches MTF to English
- **THEN** the Welcome Card keeps its Spanish text

### Requirement: Once per device, also for devices already in use
MTF SHALL place the Welcome Card automatically at most once per device, kept as a device setting outside the data document and the Backup. A device that used MTF before the Welcome Card existed SHALL get it once, on its next launch, on top of its own Cards. Deleting the Welcome Card or putting it in the Jar SHALL NOT bring it back.

#### Scenario: Device already in use
- **WHEN** MTF opens on a device that already holds the user's Cards and has never had a Welcome Card
- **THEN** a Welcome Card is placed in the first Area, on top of the user's Cards, and none of them is changed

#### Scenario: Deleted for good
- **WHEN** the user deletes the Welcome Card and reloads MTF
- **THEN** no Welcome Card is placed

#### Scenario: Import does not bring it back
- **WHEN** the user imports a Backup on a device that already had its Welcome Card
- **THEN** no Welcome Card is placed, and the Desk holds exactly the Backup's Cards

### Requirement: An ordinary Card
The Welcome Card SHALL behave like any other Card: the user SHALL be able to drag, edit, pin, place, delete and check it, and drop it in the Jar under the Jar's usual rules. MTF SHALL NOT check its Items for the user.

#### Scenario: Dragging does not check an Item
- **WHEN** the user drags the Welcome Card to another spot
- **THEN** it moves and none of its Items becomes checked

#### Scenario: Refused while unchecked
- **WHEN** the user drops the Welcome Card on the Jar with Items still unchecked
- **THEN** the Jar refuses it and it slides back, as for any Card

#### Scenario: Into the Jar when finished
- **WHEN** the user checks all three Items and drops the Welcome Card on the Jar
- **THEN** it goes into the Jar and leaves the Desk

### Requirement: Wins without a note written
Checking the Welcome Card's Items and finishing it SHALL record Wins exactly as for any Card. Placing it SHALL NOT record a note written, and neither SHALL opening and closing its editor.

#### Scenario: Checking its Items
- **WHEN** the user checks the three Items of the Welcome Card
- **THEN** 3 Item Wins and 1 Card Win are counted, and the notes written stay the same

#### Scenario: Placing it
- **WHEN** a Welcome Card is placed
- **THEN** the number of notes written and the things done are unchanged

### Requirement: See the introduction again
Settings SHALL offer "Ver introducción" (EN "See the introduction"). Activating it SHALL close Settings, place a new Welcome Card in the first Area in the current language, on top of the other Cards, and show it. It SHALL create a new one even when an earlier Welcome Card is still on the Desk.

#### Scenario: From Settings
- **WHEN** the user activates "Ver introducción" in Settings
- **THEN** Settings closes, a new Welcome Card with three unchecked Items is on top in the first Area, and the view shows it with its Items readable

#### Scenario: One already on the Desk
- **WHEN** a Welcome Card is still on the Desk and the user activates "Ver introducción"
- **THEN** a second Welcome Card is placed and the first one is unchanged

#### Scenario: After switching language
- **WHEN** MTF is in English and the user activates "See the introduction"
- **THEN** the new Welcome Card is written in English
