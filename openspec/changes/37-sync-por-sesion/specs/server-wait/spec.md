# Spec Delta

## MODIFIED Requirements

### Requirement: Sync indicator
MTF SHALL show a small sync indicator in the floating tools pill while a sync runs: a paper-plane icon with a gentle sway, in ink, never the accent. It SHALL appear only once a sync has lasted about 2 seconds, and SHALL go away when the sync ends, whether it succeeded or not.

#### Scenario: A quick sync shows nothing
- **WHEN** a sync starts and ends within 2 seconds
- **THEN** the indicator never appears

#### Scenario: A slow sync
- **WHEN** a sync lasts longer than 2 seconds, for example while the server wakes up
- **THEN** the indicator appears in the tools pill and sways gently until the sync ends

#### Scenario: A failed sync
- **WHEN** a sync that showed the indicator gives up
- **THEN** the indicator goes away, and no error is shown

#### Scenario: The indicator has a name
- **WHEN** the indicator is shown
- **THEN** assistive technology reads it as syncing ("Sincronizando…" / "Syncing…")
