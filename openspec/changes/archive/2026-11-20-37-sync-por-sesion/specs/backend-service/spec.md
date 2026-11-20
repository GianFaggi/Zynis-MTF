# Spec Delta

## ADDED Requirements

### Requirement: Sync requests have their own limits
Sync requests SHALL accept bodies larger than the other endpoints, up to a fixed limit that fits a whole Desk, and SHALL be rate limited by their own policy, apart from sign-in and sessions.

#### Scenario: A whole Desk
- **WHEN** a device sends its whole Desk of a few hundred Cards on a first sign-in
- **THEN** the server accepts it

#### Scenario: Too large
- **WHEN** a sync request is larger than the limit
- **THEN** it is refused with a stable code and nothing is written
