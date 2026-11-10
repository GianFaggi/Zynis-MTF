# Spec Delta

## Purpose

Defines how a signed-in session is kept on the device, renewed and ended, and the promise behind it: a session never expires because the device is offline, and never blocks the Desk.

## ADDED Requirements

### Requirement: A session has two tokens
Signing in SHALL give a short access token, valid for 15 minutes and kept only in memory, and a long renewal token, kept on the device. The access token SHALL be what proves the user's identity to the API.

#### Scenario: After a reload
- **WHEN** a signed-in user reloads MTF
- **THEN** the access token is gone, and the session continues with the renewal token

#### Scenario: Access token expired
- **WHEN** the API receives an access token older than 15 minutes
- **THEN** it refuses the request as not authenticated

#### Scenario: Invisible renewal
- **WHEN** the access token has expired, the server is reachable and the user opens the Account sheet
- **THEN** a new access token is obtained with no action from the user

### Requirement: The session is kept on the device
The session SHALL survive reloads and relaunches, and Account SHALL show the account's email from the device, with no connection. The session is a device setting: it SHALL NOT be part of the data document or the Backup, and an Import SHALL leave it as it was.

#### Scenario: Relaunch offline
- **WHEN** a signed-in user relaunches MTF with no connection and opens Settings
- **THEN** Settings shows the account's email

#### Scenario: Not in the Backup
- **WHEN** a signed-in user exports a Backup
- **THEN** the file holds no token and no email of the account

#### Scenario: Import leaves it
- **WHEN** a signed-in user imports a Backup
- **THEN** they are still signed in, with the same account

### Requirement: A session never expires offline
MTF SHALL decide that a session has ended only when the server says so. The device's clock, the time spent offline, a network failure, a timeout or a server error SHALL NOT end a session.

#### Scenario: A long time offline
- **WHEN** a signed-in device stays offline for a year
- **THEN** it still shows the account while it stays offline

#### Scenario: Server unreachable
- **WHEN** a renewal fails because the server does not answer or answers with a server error
- **THEN** the session is kept and tried again the next time it is needed

#### Scenario: Server asleep
- **WHEN** a renewal is under way and Render is waking up
- **THEN** the session is kept and Account keeps showing the email

### Requirement: A session never blocks the Desk
No part of the Desk, the Jar, Mis logros or the Backup SHALL wait for, or depend on, the session or a request made for it. MTF SHALL make no request at launch because of the session.

#### Scenario: Launch while signed in
- **WHEN** a signed-in user launches MTF
- **THEN** the Desk appears as fast as with no account, and no request goes to the API

#### Scenario: Session ended by the server
- **WHEN** the server says the session has ended while the user works on the Desk
- **THEN** nothing on the Desk changes, no dialog interrupts the user

### Requirement: Ending a session is quiet and positive
When the server says a session has ended, MTF SHALL remove it from the device and, the next time the Account sheet opens, invite the user to sign in again, saying the Desk is still here. It SHALL NOT suggest anything was lost.

#### Scenario: Account after the session ended
- **WHEN** the session ended and the user opens the Account sheet
- **THEN** a calm message invites them to sign in again and says their Desk is still here

### Requirement: Renewal tokens rotate
Each renewal SHALL give a new renewal token and retire the one used. MTF SHALL save the new one before using it, and SHALL read the current one from the device each time, so several tabs share one session.

#### Scenario: Renewal
- **WHEN** a renewal succeeds
- **THEN** the device holds the new renewal token, and the session keeps its 180 days from now

#### Scenario: Two tabs
- **WHEN** two open tabs renew at about the same moment
- **THEN** both keep working and the session does not end

### Requirement: A lost answer does not end the session
If a renewal's answer never arrives, for example because the phone lost signal, the same retired token SHALL be accepted again for 2 minutes after it was retired. After that, using a retired token SHALL end that session, because someone else may hold a copy.

#### Scenario: Answer lost on a bad connection
- **WHEN** a renewal succeeded on the server, its answer was lost, and the device retries with the same token within 2 minutes
- **THEN** the renewal succeeds and the session continues

#### Scenario: An old token comes back
- **WHEN** a token retired more than 2 minutes ago is used
- **THEN** the request is refused and that session ends on the server

#### Scenario: A token nobody knows
- **WHEN** an unknown renewal token is used
- **THEN** the request is refused and no session changes

### Requirement: Sessions last 180 days from their last renewal
A renewal token SHALL be accepted for 180 days after it was issued, and every renewal SHALL restart that time. Only the server SHALL check it.

#### Scenario: Used within the time
- **WHEN** a session is renewed 179 days after its last renewal
- **THEN** the renewal succeeds

#### Scenario: Past the time
- **WHEN** a session is renewed 181 days after its last renewal
- **THEN** the server refuses it and MTF treats the session as ended, with the Desk untouched

### Requirement: Sign out
Signing out SHALL remove the session from the device at once, with or without a connection, and tell the server when it can. It SHALL NOT remove any Card, Area or Win, and Account SHALL say that the notes stay on this device.

#### Scenario: Sign out online
- **WHEN** a signed-in user signs out with a connection
- **THEN** the device forgets the session and its renewal token stops working on the server

#### Scenario: Sign out offline
- **WHEN** a signed-in user signs out with no connection
- **THEN** the device forgets the session at once, and no error is shown

#### Scenario: The notes stay
- **WHEN** the user signs out
- **THEN** every Card, Area and Win on this device is still there

#### Scenario: Other devices
- **WHEN** a user signs out on one device
- **THEN** the session on their other devices keeps working

### Requirement: Storage refused
If the browser refuses storage, signing in SHALL still work for that launch, kept in memory, without crashing.

#### Scenario: Storage refused
- **WHEN** the browser refuses storage and the user signs in
- **THEN** Account shows the account for that launch and nothing crashes
