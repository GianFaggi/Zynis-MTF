# Spec Delta

## MODIFIED Requirements

### Requirement: No network needed at runtime
MTF SHALL NOT need any network request to work once loaded. The page SHALL make requests only to its own origin and to its own API address, and only when the user opens the Account sheet, a mail link, or the Google sign-in window. It SHALL load nothing from third-party hosts, and API answers SHALL never be cached by the service worker.

#### Scenario: External requests
- **WHEN** MTF loads and the user opens Settings and switches language
- **THEN** no request leaves the MTF origin

#### Scenario: Launch while signed in
- **WHEN** a signed-in user launches MTF and works on the Desk
- **THEN** no request leaves the MTF origin

#### Scenario: Opening the Account sheet
- **WHEN** the user opens the Account sheet with no session and a connection
- **THEN** the only request that leaves the MTF origin goes to its own API address

#### Scenario: API answers are not kept
- **WHEN** an API request has been answered and the device goes offline
- **THEN** the same request fails instead of being answered by the service worker
