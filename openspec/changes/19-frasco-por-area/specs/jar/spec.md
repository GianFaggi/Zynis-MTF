# Spec Delta

## ADDED Requirements

### Requirement: A jar per Area option
Settings SHALL offer "Frasco por área" (EN "A jar per area") with No / Sí, off by default. It SHALL be remembered on the device across reloads, like the theme. It SHALL NOT be part of a Backup, and an Import SHALL leave it as it was. Turning it on or off SHALL NOT change any Card, Area or Win.

#### Scenario: Off by default
- **WHEN** MTF opens for the first time and the user opens Settings
- **THEN** "Frasco por área" shows No, and no Area shows a small Jar

#### Scenario: Remembered
- **WHEN** the user turns "Frasco por área" on and reloads MTF
- **THEN** the option is still on and every Area shows its small Jar

#### Scenario: Not in the Backup
- **WHEN** the user exports a Backup on a PC with the option on and imports it on a phone where it is off
- **THEN** the option stays off on the phone

### Requirement: An Area Jar in each Area
While "Frasco por área" is on, each Area SHALL show a small Jar in its top-right corner. It holds one piece per Card of that Area in the Jar, in the Area's color, and a label with how many there are. Its accessible name SHALL include the Area's name. It SHALL move and resize with its Area. The Desk's Jar SHALL stay in its place, still holding every Card, and the Dock's "Frasco" SHALL still fly to it.

#### Scenario: Small Jars appear
- **WHEN** the Jar holds one Card from Trabajo and two from Vida, and the user turns the option on
- **THEN** Trabajo's small Jar shows 1, Vida's shows 2, Recordar's shows 0, and the Desk's Jar still shows 3

#### Scenario: The Dock still goes to the Desk's Jar
- **WHEN** the option is on and the user activates "Frasco" in the Dock
- **THEN** the view moves to the Desk's Jar

#### Scenario: Moves with its Area
- **WHEN** the option is on and the user moves the Area Vida 600 px to the right
- **THEN** Vida's small Jar is still in Vida's top-right corner

### Requirement: Area Jars hide when zoomed out
While the Desk is zoomed out to the far look, where Cards show only their title, Area Jars SHALL NOT be shown and SHALL NOT receive Cards. A Card released there SHALL be placed as on any paper. The Desk's Jar SHALL always be shown.

#### Scenario: Far look
- **WHEN** the option is on and the user zooms out until Cards show only their title
- **THEN** no small Jar is shown and the Desk's Jar still is

#### Scenario: Zoom back in
- **WHEN** the user zooms back in past the far look
- **THEN** every Area shows its small Jar again

### Requirement: Drop a Card on its own Area Jar
A Card released with its center over the small Jar of its own Area SHALL follow the Desk Jar's rules: a finished Card or a Card without Items goes in, with the same animation, toast and counter bump, and a Card with unchecked Items is refused and slides back with the same toast. While a dragged Card is over a small Jar, that Jar SHALL be highlighted. It SHALL work with the mouse and with press and hold on touch.

#### Scenario: Finished Card into its own Area Jar
- **WHEN** the option is on and the user drops a finished Card from Vida on Vida's small Jar
- **THEN** the Card leaves the Desk, Vida's small Jar and the Desk's Jar each count one more, and a toast reads "¡Al frasco!"

#### Scenario: Refused
- **WHEN** the user drops a Card from Vida with 2 unchecked Items on Vida's small Jar
- **THEN** the Card goes back to where it was picked up and a toast reads "Todavía no" and "Te faltan 2 elementos"

#### Scenario: Touch
- **WHEN** on a phone the user holds a finished Card until it lifts, drags it onto its Area's small Jar and lifts the finger
- **THEN** the Card goes into the Jar

#### Scenario: Highlight
- **WHEN** the user drags a Card over a small Jar without releasing it
- **THEN** that small Jar is highlighted

### Requirement: Dropping on another Area's Jar asks first
When a Card that the Jar would accept is released over the small Jar of another Area, MTF SHALL ask whether to move it to that Area and put it in the Jar ("¿Pasarla a Vida y llevarla al frasco?", Sí / No), keeping the Card where it was released until the answer. A Card that the Jar would refuse SHALL be refused as on its own Area Jar, without asking.

#### Scenario: The question
- **WHEN** the option is on and the user drops a finished Card from Trabajo on Vida's small Jar
- **THEN** MTF asks "¿Pasarla a Vida y llevarla al frasco?" with Sí and No, and nothing is written yet

#### Scenario: Refused without asking
- **WHEN** the user drops a Card from Trabajo with 1 unchecked Item on Vida's small Jar
- **THEN** the Card goes back to where it was picked up, a toast reads "Te falta 1 elemento", and nothing is asked

### Requirement: Answering the question
Sí SHALL move the Card to the other Area and put it in the Jar in one step, with the same animation, toast and counter bump as any accepted Card. No, `Esc` or tapping outside the question SHALL put the Card back where the drag started, in its own Area, with nothing written. No Win SHALL be lost either way.

#### Scenario: Sí
- **WHEN** MTF asks about a finished Card from Trabajo over Vida's small Jar and the user chooses Sí
- **THEN** the Card is in the Jar as a Card of Vida, Vida's small Jar counts one more, Trabajo's does not, and a toast reads "¡Al frasco!"

#### Scenario: No
- **WHEN** MTF asks about a Card from Trabajo and the user chooses No
- **THEN** the Card is back where it was picked up, still in Trabajo, and the Jar holds the same Cards

#### Scenario: Esc
- **WHEN** MTF asks and the user presses `Esc`
- **THEN** the Card is back where it was picked up, still in Trabajo

#### Scenario: Reload after Sí
- **WHEN** the user chose Sí and reloads MTF
- **THEN** the Card is still in the Jar as a Card of Vida

### Requirement: Open Mis logros from an Area Jar
Tapping or clicking an Area Jar, or pressing `Enter` on it when it has keyboard focus, SHALL open Mis logros showing that Area. A press on an Area Jar that moves SHALL pan the Desk instead.

#### Scenario: Tap Vida's small Jar
- **WHEN** the option is on and the user taps Vida's small Jar
- **THEN** Mis logros opens with Vida chosen in its Area filter

#### Scenario: Pan from an Area Jar
- **WHEN** the user drags the paper starting on a small Jar
- **THEN** the Desk pans and Mis logros does not open
