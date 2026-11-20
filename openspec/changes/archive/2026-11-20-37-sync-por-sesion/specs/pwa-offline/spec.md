# Spec Delta

## MODIFIED Requirements

### Requirement: No network needed at runtime
MTF SHALL NOT need any network request to work once loaded. The page SHALL make requests only to its own origin and to its own API address: with no session, only when the user opens the Account sheet, a mail link, or the Google sign-in window; with a session, also for sync (arriving, leaving, idle, back online, Sincronizar ahora, and the wake-up while changes are pending). It SHALL load nothing from third-party hosts, and API answers SHALL never be cached by the service worker.

#### Scenario: External requests
- **WHEN** MTF loads and the user opens Settings and switches language
- **THEN** no request leaves the MTF origin

#### Scenario: Launch with no session
- **WHEN** a user with no session launches MTF and works on the Desk
- **THEN** no request leaves the MTF origin

#### Scenario: Launch while signed in
- **WHEN** a signed-in user launches MTF and works on the Desk
- **THEN** the only requests that leave the MTF origin are sync requests to its own API address, and the Desk never waits for them

#### Scenario: Opening the Account sheet
- **WHEN** the user opens the Account sheet with no session and a connection
- **THEN** the only request that leaves the MTF origin goes to its own API address

#### Scenario: API answers are not kept
- **WHEN** an API request has been answered and the device goes offline
- **THEN** the same request fails instead of being answered by the service worker
