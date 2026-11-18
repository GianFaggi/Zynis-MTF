# Spec Delta

## MODIFIED Requirements

### Requirement: A session never blocks the Desk
No part of the Desk, the Jar, Mis logros or the Backup SHALL wait for, or depend on, the session or a request made for it. At launch, a signed-in device SHALL start sync in the background, renewing the access token as part of it, and SHALL show the Desk without waiting for either.

#### Scenario: Launch while signed in
- **WHEN** a signed-in user launches MTF
- **THEN** the Desk appears as fast as with no account, and sync starts in the background

#### Scenario: Session ended by the server
- **WHEN** the server says the session has ended while the user works on the Desk
- **THEN** nothing on the Desk changes, no dialog interrupts the user, sync stops, and the pending changes stay on the device
