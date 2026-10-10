# Spec Delta

## Purpose

Keeps the user's data in their own browser, with no server, in a form that later versions can migrate and that V2 sync can build on. It defines the stored document, its safe defaults, and how unreadable data is protected instead of lost.

## ADDED Requirements

### Requirement: One versioned data document
MTF SHALL keep the user's Areas, Cards and win events in one stored document that carries a schema version number. Every stored Area, Card, Item and win event SHALL have a unique id; Areas, Cards and Items SHALL also have creation and last-update timestamps.

#### Scenario: Saved document shape
- **WHEN** MTF saves the user's data
- **THEN** the stored document contains a schema version, a list of Areas, a list of Cards and a list of win events

#### Scenario: Ids are unique
- **WHEN** MTF creates many new ids
- **THEN** no two ids are equal

### Requirement: Empty start
When there is no stored data, MTF SHALL start from an empty document at the current schema version and SHALL NOT fail.

#### Scenario: First launch
- **WHEN** MTF opens in a browser with no MTF data
- **THEN** it loads an empty document with no Areas, Cards or win events at the current schema version

### Requirement: Data survives reloads
Data saved by MTF SHALL be read back unchanged on the next launch in the same browser.

#### Scenario: Round trip
- **WHEN** MTF saves a document with Areas, Cards and win events and the page is reloaded
- **THEN** MTF loads a document equal to the one saved

### Requirement: Unreadable data is kept, not overwritten
If the stored document cannot be read (invalid JSON, wrong shape, or a schema version newer than MTF understands), MTF SHALL keep a copy of the raw stored text under a separate name before starting from an empty document, so the data can still be recovered.

#### Scenario: Corrupt data
- **WHEN** the stored document is not valid JSON
- **THEN** MTF starts with an empty document
- **AND** the original text is still stored under a separate recovery name

#### Scenario: Data from a newer version
- **WHEN** the stored document has a schema version higher than the one MTF knows
- **THEN** MTF does not overwrite that data without first keeping a recovery copy

### Requirement: Older data is migrated
When the stored document has an older schema version, MTF SHALL migrate it step by step to the current version on load, without losing Areas, Cards or win events.

#### Scenario: Current version loads as is
- **WHEN** the stored document already has the current schema version
- **THEN** it loads without changes

### Requirement: Storage failures never crash the app
If the browser refuses to read or write storage (blocked storage, private mode, quota exceeded), MTF SHALL keep working with its in-memory state and SHALL NOT crash.

#### Scenario: Storage blocked
- **WHEN** reading or writing browser storage throws an error
- **THEN** MTF still shows the base paper screen and its settings
