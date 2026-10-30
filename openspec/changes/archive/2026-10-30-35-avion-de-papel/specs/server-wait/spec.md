# Spec Delta

## Purpose

Defines how MTF shows that it is waiting for its server: the paper plane as the sign that the desk is travelling between devices, a timeline of calm messages instead of a progress bar, and a small sync indicator. Sign-in and sync will use these pieces.

## ADDED Requirements

### Requirement: The paper plane is the sign of travel
MTF SHALL show a paper plane while it waits for its server. The plane SHALL be drawn in ink with a paper fill and SHALL NOT use the accent color, because travelling is not a Win. While it flies, it SHALL follow a soft arc and leave a dotted pencil trail; it SHALL leave on the right and come back in from the left, in a loop.

#### Scenario: The plane in light and dark
- **WHEN** the paper plane is shown in the light theme and in the dark theme
- **THEN** its outline is ink and its fill is paper in both, and none of it uses the accent color

#### Scenario: The plane loops
- **WHEN** the plane is flying
- **THEN** it crosses along an arc, leaves on the right and comes back in from the left, leaving a dotted trail behind it

### Requirement: Quiet start of a wait
For the first 1.5 seconds of a wait, MTF SHALL show only the message "Entrando…" ("Signing in…"), with no plane and no animation, so a server that answers quickly causes no flicker.

#### Scenario: The server answers quickly
- **WHEN** a wait starts and the server answers after 1 second
- **THEN** only "Entrando…" was shown, and the plane never appeared

#### Scenario: Still within the quiet start
- **WHEN** a wait has lasted 1.4 seconds
- **THEN** "Entrando…" is shown and the plane is not

### Requirement: Wait messages follow a timeline
A wait SHALL change its message as time passes, with no progress bar and no countdown: at 1.5 s the plane appears with "Conectando…"; at 8 s "El servidor se está despertando. La primera vez del día puede tardar hasta un minuto."; at 30 s "Ya casi…". Each message SHALL replace the one before it.

#### Scenario: The plane takes off
- **WHEN** a wait reaches 1.5 seconds
- **THEN** the plane appears, flying, with "Conectando…"

#### Scenario: The server is waking up
- **WHEN** a wait reaches 8 seconds
- **THEN** the message explains that the server is waking up and that the first time each day can take up to a minute

#### Scenario: Almost there
- **WHEN** a wait reaches 30 seconds
- **THEN** the message reads "Ya casi…"

#### Scenario: No progress bar
- **WHEN** a wait is shown at any moment
- **THEN** there is no progress bar, percentage or countdown

### Requirement: A wait that never ends stays positive
When a wait reaches 90 seconds, MTF SHALL stop the plane and show "No pudimos conectar ahora. Tu escritorio sigue funcionando; probá en un rato." The message SHALL NOT blame the user or suggest that something on their desk was lost.

#### Scenario: No connection after 90 seconds
- **WHEN** a wait reaches 90 seconds without an answer
- **THEN** the plane stops flying
- **AND** the message says that MTF could not connect now, that the desk still works, and to try again later

#### Scenario: The desk is untouched
- **WHEN** the 90-second message is shown
- **THEN** every Card, Area and Win on the Desk is still there and still works

### Requirement: Sync indicator
MTF SHALL offer a small sync indicator for the floating tools pill: a paper-plane icon with a gentle sway, in ink, never the accent. It SHALL appear only once a wait has lasted about 2 seconds, and SHALL go away when the wait ends.

#### Scenario: A quick sync shows nothing
- **WHEN** a wait starts and ends within 2 seconds
- **THEN** the indicator never appears

#### Scenario: A slow sync
- **WHEN** a wait lasts longer than 2 seconds
- **THEN** the indicator appears and sways gently until the wait ends

#### Scenario: The indicator has a name
- **WHEN** the indicator is shown
- **THEN** assistive technology reads it as syncing ("Sincronizando…" / "Syncing…")

### Requirement: Waiting with reduced motion
When the device asks for reduced motion, the plane SHALL stay still with its trail fully drawn, and the indicator SHALL NOT sway. The timeline and its messages SHALL be the same as with motion.

#### Scenario: Reduced motion during a wait
- **WHEN** reduced motion is on and a wait reaches 8 seconds
- **THEN** the plane is shown still, and the message is the same one shown with motion

### Requirement: Wait messages are announced in both languages
Every wait message SHALL be shown in the current UI language, Spanish or English, inside a polite live region, so screen readers announce each new message without interrupting the user.

#### Scenario: Message in English
- **WHEN** the UI is in English and a wait reaches 1.5 seconds
- **THEN** the message reads "Connecting…"

#### Scenario: Each message is announced
- **WHEN** the wait message changes
- **THEN** the new message is inside a polite live region
