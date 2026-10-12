## ADDED Requirements

### Requirement: Ask the browser to keep the data
Once the user's data holds at least one Card (when MTF opens with Cards, or right after the first Card is kept), MTF SHALL ask the browser to keep its storage persistent, so it is not evicted under storage pressure. MTF SHALL ask at most once per launch and SHALL NOT ask when the storage is already persistent. A browser that refuses or does not support the request SHALL NOT change anything the user sees, and MTF SHALL NOT show a message about it.

#### Scenario: First Card kept
- **WHEN** the user keeps their first Card and the storage is not yet persistent
- **THEN** MTF asks the browser to make its storage persistent

#### Scenario: Empty Desk
- **WHEN** MTF opens with no Cards
- **THEN** MTF does not ask for persistent storage yet

#### Scenario: Already persistent
- **WHEN** MTF opens with Cards and the browser reports the storage is already persistent
- **THEN** MTF does not ask again

#### Scenario: Not supported or refused
- **WHEN** the browser has no persistent storage API, or refuses the request
- **THEN** MTF keeps working as before and shows no error
