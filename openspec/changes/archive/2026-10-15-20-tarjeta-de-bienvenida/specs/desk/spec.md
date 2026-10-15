# Spec Delta

## MODIFIED Requirements

### Requirement: Initial view
On opening, MTF SHALL show the whole Desk when it fits at 34% zoom or more; otherwise it SHALL show the first Area at a size readable on a phone. On the launch that placed a Welcome Card, MTF SHALL instead show the Welcome Card at a size where its text and Items are readable.

#### Scenario: Desktop
- **WHEN** MTF opens in a wide desktop window
- **THEN** all Areas are visible at once

#### Scenario: Phone
- **WHEN** MTF opens on a phone-sized screen
- **THEN** the first Area is shown and its Cards' text is readable

#### Scenario: Welcome Card on a desktop
- **WHEN** MTF opens in a wide desktop window and places a Welcome Card
- **THEN** the Welcome Card is in view and its Items are readable

#### Scenario: Welcome Card on a phone
- **WHEN** MTF opens on a phone-sized screen and places a Welcome Card
- **THEN** the Welcome Card is in view and its Items are readable

### Requirement: Accent reserved for wins on the Desk
The Desk, its Areas, the Dock and search highlights SHALL NOT use the accent color. On the Desk, only things the user did may use it: checked Items, a finished Card (its fill, border, halo, title, chip and seal), and the Jar.

#### Scenario: Search highlight
- **WHEN** a search outlines matching Cards
- **THEN** the outline uses ink, not the accent color

#### Scenario: Dock
- **WHEN** the Dock is shown, including its "Frasco" button
- **THEN** none of its buttons uses the accent color

## REMOVED Requirements

### Requirement: First-run hint
**Reason**: Replaced by the Welcome Card (`welcome` capability, #20), which teaches dragging, checking and the Jar by doing them instead of a hint that is read and dismissed.
**Migration**: The hint and its dismissed flag (`mtf_hint_seen`) are gone. Every device, including one that dismissed the hint, gets the Welcome Card once; "Ver introducción" in Settings brings a new one back.
