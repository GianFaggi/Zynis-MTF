# Spec Delta

## MODIFIED Requirements

### Requirement: What travels
Sync SHALL carry every Area, every Card (on the Desk and in the Jar, with its Items and its handwriting) and every Win of the signed-in Account. It SHALL NOT carry device settings: the language, the theme, Mi disposición, Frasco por área, Escritura a mano, the Welcome Card flag, the install nudge and the session stay on each device.

#### Scenario: A Card reaches the other device
- **WHEN** the user writes a Card on the phone, leaves MTF, and then opens MTF on the PC with the same Account
- **THEN** the Card is on the PC's Desk, in the same Area and position, with its Items

#### Scenario: Handwriting reaches the other device
- **WHEN** the user writes by hand in a Card on the iPad, leaves MTF, and then opens MTF on the PC with the same Account
- **THEN** the Card on the PC shows the same handwriting

#### Scenario: Wins reach the other device
- **WHEN** the user checks an Item on the phone and later opens MTF on the PC
- **THEN** Mis logros on the PC counts that Win on the day it happened

#### Scenario: Settings stay on each device
- **WHEN** the user switches the PC to the dark theme and English and then opens MTF on the phone
- **THEN** the phone keeps its own theme and language

#### Scenario: The handwriting setting stays on each device
- **WHEN** the user turns "Escritura a mano" on on the iPad and then opens MTF on the phone
- **THEN** the phone keeps "Escritura a mano" as it was
