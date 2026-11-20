# Spec Delta

## MODIFIED Requirements

### Requirement: An account is optional
MTF SHALL open and work fully with no account and no connection. No Card, Area, Win or setting SHALL depend on having an account. Signing in SHALL change the Desk only through the first sign-in rule of sync, and signing out SHALL NOT change anything on the Desk.

#### Scenario: Never signed in
- **WHEN** a user who never created an account uses MTF
- **THEN** every feature of the Desk, the Jar, Mis logros and the Backup works as before

#### Scenario: Signing in leaves the Desk alone
- **WHEN** the user signs in
- **THEN** every Card, Area and Win on this device is unchanged, except as the sync first sign-in rule says: sent to an empty Account, replaced on a new device, or left as it is until the user chooses in the dialog

#### Scenario: Nothing is uploaded
- **WHEN** the user signs in or registers
- **THEN** no Card, Area or Win is sent to the server before the first sign-in rule has decided, and never while the dialog waits for the user

#### Scenario: Signing out leaves the Desk alone
- **WHEN** the user signs out
- **THEN** every Card, Area and Win on this device is unchanged

### Requirement: Account in Settings
The Settings sheet SHALL show a "Cuenta" / "Account" section with the current state, opening an Account sheet. Settings SHALL close first, and opening Settings alone SHALL make no network request. While signed in, the section SHALL also show the sync status, "Sincronizar ahora", and, during the 30 days after a replacement, "Recuperar el escritorio anterior".

#### Scenario: No account
- **WHEN** the user opens Settings with no session
- **THEN** the section says the Desk lives on this device and offers to sign in
- **AND** no network request is made

#### Scenario: Signed in
- **WHEN** the user opens Settings with a session, online or not
- **THEN** the section shows the account's email, when the last sync finished and how many changes are pending
- **AND** opening Settings makes no network request

#### Scenario: Sync now in Settings
- **WHEN** the user opens Settings with a session
- **THEN** the section offers Sincronizar ahora

#### Scenario: Recovery offered
- **WHEN** the user opens Settings within 30 days after this device's Desk was replaced by the Account's
- **THEN** the section offers Recuperar el escritorio anterior

#### Scenario: The Account sheet
- **WHEN** the user activates the section
- **THEN** Settings closes and the Account sheet opens with sign in, register and recover if there is no session, or the email, the sync status and sign out if there is one

#### Scenario: Password managers
- **WHEN** a sign-in or register form is shown
- **THEN** its fields are marked as email, current password or new password, so a password manager can fill them
