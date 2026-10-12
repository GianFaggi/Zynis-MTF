## ADDED Requirements

### Requirement: Backup section in Settings
The Settings sheet SHALL show a "Copia de seguridad" / "Backup" section with a short note that the notes are saved in this browser and that a Backup moves them to another device, an Export button and an Import button. These controls SHALL NOT use the accent color.

#### Scenario: Open the Backup section
- **WHEN** the user opens Settings
- **THEN** the Backup section shows its note, an Export button and an Import button

### Requirement: Export makes a Backup file
Export SHALL produce one JSON file named `mtf-backup-YYYY-MM-DD.json`, with the local date of the export, that holds the user's whole data document: every Area, every Card (on the Desk and in the Jar) with its Items, and every win event, at the current schema version, plus a marker that identifies it as an MTF Backup and the moment it was exported. Device settings (language, dismissed hints) SHALL NOT be part of the file.

#### Scenario: File name
- **WHEN** the user exports on October 11, 2026 (local time)
- **THEN** the file is named `mtf-backup-2026-10-11.json`

#### Scenario: Everything is in the file
- **WHEN** the user has Cards on the Desk, Cards in the Jar and Wins, and exports
- **THEN** the file contains all of those Areas, Cards, Items and win events

#### Scenario: Language is not exported
- **WHEN** the user exports with the language set to English
- **THEN** the file has no language setting

### Requirement: Export shares on phones and downloads elsewhere
On a touch device whose browser can share files, Export SHALL open the system share sheet with the Backup file. Everywhere else, and when sharing fails for any reason other than the user cancelling, Export SHALL download the file. Cancelling the share sheet SHALL do nothing else. After the file was handed to the share sheet or downloaded, MTF SHALL show a toast naming the file.

#### Scenario: PC
- **WHEN** the user exports on a desktop browser
- **THEN** the file `mtf-backup-YYYY-MM-DD.json` is downloaded
- **AND** a toast confirms it

#### Scenario: Phone that can share files
- **WHEN** the user exports on a phone whose browser can share files
- **THEN** the system share sheet opens with the Backup file

#### Scenario: Share cancelled
- **WHEN** the share sheet opens and the user closes it without choosing a target
- **THEN** nothing is downloaded and no error is shown

#### Scenario: Share fails
- **WHEN** the share sheet cannot open the file
- **THEN** the file is downloaded instead

### Requirement: What a valid Backup is
Import SHALL accept a file only when it is an MTF Backup whose schema version MTF understands and whose Areas, Cards, Items and win events all have a valid shape: unique ids, the expected fields with the expected types, Area colors from the known set, every Card in an Area of the file, and at least one Area. An older version SHALL be migrated to the current one.

#### Scenario: Valid Backup accepted
- **WHEN** the user picks a Backup exported by this version of MTF
- **THEN** MTF offers to import it

### Requirement: Import checks the file before anything changes
Import SHALL let the user pick a file and SHALL read it without changing any data. When the file is refused, MTF SHALL show a clear message for the reason, and the user's current data SHALL stay exactly as it was.

#### Scenario: Not an MTF Backup
- **WHEN** the user picks a file that is not JSON, or JSON that is not an MTF Backup
- **THEN** MTF says the file is not an MTF Backup
- **AND** the current Areas, Cards and Wins are unchanged

#### Scenario: Backup from a newer MTF
- **WHEN** the user picks a Backup whose schema version is higher than the one this MTF understands
- **THEN** MTF says the Backup was made by a newer version of MTF
- **AND** the current data is unchanged

#### Scenario: Damaged Backup
- **WHEN** the user picks an MTF Backup with a Card that has no id, or a Card whose Area does not exist in the file
- **THEN** MTF says the Backup is damaged and cannot be used
- **AND** the current data is unchanged

#### Scenario: Older Backup
- **WHEN** the user picks a valid Backup with an older schema version
- **THEN** MTF migrates it and offers to import it

### Requirement: Import asks before replacing
For an accepted file, MTF SHALL show what the Backup holds (export date, Cards on the Desk, Cards in the Jar, things done) and state that it replaces everything on this device, and SHALL replace the data only after the user explicitly confirms. Cancelling SHALL leave the data unchanged. Import SHALL always replace the whole data document; it SHALL NOT merge.

#### Scenario: Summary before confirming
- **WHEN** the user picks a valid Backup with 12 Cards on the Desk, 3 in the Jar and 40 things done
- **THEN** MTF shows those numbers and the export date
- **AND** asks for confirmation before replacing

#### Scenario: Cancel
- **WHEN** the confirmation is shown and the user cancels
- **THEN** the current data is unchanged

#### Scenario: Confirm
- **WHEN** the user confirms
- **THEN** the Areas, Cards and win events on this device are exactly those of the Backup
- **AND** Cards that existed only on this device are gone

### Requirement: The Desk after an Import
After a confirmed Import, MTF SHALL close Settings and any open editor, show the whole Desk with the imported Cards and the Jar with the imported Cards in it, show a toast confirming the Import, and keep the imported data after a reload. Mis logros and the wins counter SHALL count the imported win events. The language and other device settings SHALL stay as they were.

#### Scenario: Imported data is shown and kept
- **WHEN** the user confirms an Import and then reloads MTF
- **THEN** the Desk shows the imported Cards and the Jar holds the imported Cards in the Jar

#### Scenario: Language kept
- **WHEN** the user, with MTF in English, imports a Backup made on a device in Spanish
- **THEN** MTF stays in English

### Requirement: Round trip keeps the data exactly
Exporting a data document and importing the resulting file SHALL produce a document equal to the one exported, field by field.

#### Scenario: Export then import
- **WHEN** the user exports, changes some Cards, and imports the file they exported
- **THEN** the data is exactly what it was at the moment of the export

### Requirement: Backup works offline
Export and Import SHALL work with no connection and SHALL NOT make any request outside the MTF origin.

#### Scenario: Offline Backup
- **WHEN** the device is offline and the user exports and imports
- **THEN** both complete and no request leaves the MTF origin
