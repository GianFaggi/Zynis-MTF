# Spec Delta

## MODIFIED Requirements

### Requirement: Export makes a Backup file
Export SHALL produce one JSON file named `mtf-backup-YYYY-MM-DD.json`, with the local date of the export, that holds the user's whole data document: every Area, every Card (on the Desk and in the Jar) with its Items, and every win event, at the current schema version, plus a marker that identifies it as an MTF Backup and the moment it was exported. Device settings (language, theme, dismissed hints) SHALL NOT be part of the file.

#### Scenario: File name
- **WHEN** the user exports on October 11, 2026 (local time)
- **THEN** the file is named `mtf-backup-2026-10-11.json`

#### Scenario: Everything is in the file
- **WHEN** the user has Cards on the Desk, Cards in the Jar and Wins, and exports
- **THEN** the file contains all of those Areas, Cards, Items and win events

#### Scenario: Language is not exported
- **WHEN** the user exports with the language set to English
- **THEN** the file has no language setting

#### Scenario: Theme is not exported
- **WHEN** the user exports with the theme set to Dark
- **THEN** the file has no theme setting
