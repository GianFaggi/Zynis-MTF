# Spec Delta

## ADDED Requirements

### Requirement: An Import while signed in becomes the Account's Desk
When a device with a session imports a Backup, the imported Desk SHALL replace the Account's Desk on the next sync, as if the user had chosen Subir este: every imported Area, Card and Win wins over the Account's copy, and what is not in the file is deleted from the Account. The import confirmation SHALL say so.

#### Scenario: Import on a signed-in device
- **WHEN** a signed-in user imports a Backup and confirms
- **THEN** after the next sync, every device of the Account shows the imported Desk

#### Scenario: The confirmation says it
- **WHEN** a signed-in user picks a valid Backup to import
- **THEN** the confirmation says the Desk on the Account's other devices will be replaced too

#### Scenario: No session
- **WHEN** a user with no session imports a Backup
- **THEN** the Import behaves as before and nothing is sent
