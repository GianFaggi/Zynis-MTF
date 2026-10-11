# Spec Delta

## MODIFIED Requirements

### Requirement: Accent reserved for wins
The app shell SHALL NOT use the accent color for decoration, navigation or settings controls; the accent is reserved for wins. The wins counter in the floating tools is the only shell control that uses it.

#### Scenario: Shell controls
- **WHEN** the base screen and the Settings sheet are shown
- **THEN** no control on them uses the accent color, except the wins counter

#### Scenario: Toasts
- **WHEN** a toast is shown
- **THEN** it uses ink and paper colors, not the accent color
