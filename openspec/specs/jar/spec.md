# jar Specification

## Purpose

Defines the Jar: the place on the Desk where the user puts Cards they are done with. It covers where the Jar sits, which Cards it accepts or refuses, how it fills up, and how Cards come back out of it.

## Requirements

### Requirement: The Jar on the Desk
The Jar SHALL sit on the Desk at the center of the Areas when that space, with its caption, is free of Areas, and centered below the Areas otherwise, with a caption showing the things done this week and that tapping it shows more. It SHALL pan and zoom with the Desk like everything on it, and stay where it is when Cards are moved or tidied up.

#### Scenario: Default Desk
- **WHEN** MTF opens with the three default Areas
- **THEN** the Jar is drawn below the Area Vida, with the caption "Tu frasco" and "N esta semana · tocalo para ver más"

#### Scenario: Zooming
- **WHEN** the user zooms the Desk out
- **THEN** the Jar shrinks with the Desk and stays in its place among the Areas

#### Scenario: Areas around an empty center
- **WHEN** the user arranges the Areas as Estrella
- **THEN** the Jar and its caption sit in the middle of the ring, overlapping no Area

#### Scenario: An Area takes the center
- **WHEN** the Areas are arranged as Fila or Tabla, so an Area or the space between two Areas too narrow for the Jar is at their center
- **THEN** the Jar sits centered below the Areas, as before

### Requirement: Drop a Card on the Jar
When a dragged Card is released with its center over the Jar and the Card is finished or has no Items, the Jar SHALL accept it. The Card SHALL shrink into the Jar and leave the Desk, a toast SHALL read "¡Al frasco!" with the things done in the last 7 days, and the wins counter SHALL bump. This SHALL work with the mouse and with press and hold on touch.

#### Scenario: Drop a finished Card
- **WHEN** the user drags a finished Card onto the Jar and releases it
- **THEN** the Card leaves the Desk and its Area's count drops by one
- **AND** a toast reads "¡Al frasco!" and "Ya van N cosas hechas en 7 días"

#### Scenario: Drop a Card without Items
- **WHEN** the user drops a Card that has only a title and text onto the Jar
- **THEN** the Jar accepts it

#### Scenario: Touch
- **WHEN** on a phone the user holds a finished Card until it lifts, drags it onto the Jar and lifts the finger
- **THEN** the Jar accepts it

### Requirement: The Jar highlights while a Card is over it
While a dragged Card's center is over the Jar, the Jar SHALL show that it is ready to receive it, and the Card SHALL NOT preview another Area's color.

#### Scenario: Hover over the Jar
- **WHEN** the user drags a Card over the Jar without releasing it
- **THEN** the Jar is highlighted

### Requirement: Refused Cards go back
When a Card with unchecked Items is released over the Jar, the Jar SHALL refuse it. The Card SHALL slide back to where the drag started, keep its Area, and a toast SHALL read "Todavía no" with the number of Items still to check. Nothing SHALL be counted or removed.

#### Scenario: Two Items left
- **WHEN** the user drops a Card with 2 unchecked Items onto the Jar
- **THEN** the Card goes back to where it was picked up, in the same Area
- **AND** a toast reads "Todavía no" and "Te faltan 2 elementos"

#### Scenario: One Item left
- **WHEN** the user drops a Card with 1 unchecked Item onto the Jar
- **THEN** the toast reads "Te falta 1 elemento"

### Requirement: A Card goes into the Jar counted once
When the Jar accepts a Card that has no Card Win yet (a Card without Items), MTF SHALL record its Card Win. A finished Card already has one and SHALL NOT get another.

#### Scenario: Card without Items
- **WHEN** the Jar accepts a Card without Items
- **THEN** one more Card finished is counted

#### Scenario: Already counted
- **WHEN** the user finishes a Card by checking its last Item and then drops it in the Jar
- **THEN** the Card is counted as finished once

### Requirement: The Jar fills up
The Jar SHALL hold one paper piece per Card in it, in the color of that Card's Area, and a label with the number of Cards in it. When a Card goes in, its piece SHALL drop into the Jar with a short animation and sparks. Once the Jar looks full, more pieces SHALL NOT be drawn, but the number SHALL keep counting.

#### Scenario: Pieces in Area colors
- **WHEN** the Jar holds one Card from Trabajo and two from Vida
- **THEN** it shows one piece in Trabajo's color, two in Vida's color, and the number 3

#### Scenario: A new piece
- **WHEN** the Jar accepts a Card from Recordar
- **THEN** a piece in Recordar's color drops into the Jar and its number goes up by one

#### Scenario: A full Jar
- **WHEN** the Jar holds more Cards than it can show pieces for
- **THEN** it looks full and its number still shows every Card in it

### Requirement: Cards in the Jar are kept
A Card in the Jar SHALL no longer be shown on the Desk, counted in its Area, found by search or moved by Tidy up, but it SHALL be kept with its content and Area, also after a reload.

#### Scenario: Reload
- **WHEN** the user drops a Card in the Jar and reloads MTF
- **THEN** the Card is still in the Jar and not on the Desk

#### Scenario: Search
- **WHEN** the user searches for the title of a Card in the Jar
- **THEN** no Card on the Desk is outlined for it

### Requirement: Open Mis logros from the Jar
Tapping or clicking the Jar, or pressing `Enter` on it when it has keyboard focus, SHALL open Mis logros. A press on the Jar that moves SHALL pan the Desk instead.

#### Scenario: Tap the Jar
- **WHEN** the user taps the Jar
- **THEN** the Mis logros sheet opens

#### Scenario: Pan from the Jar
- **WHEN** the user drags the paper starting on the Jar
- **THEN** the Desk pans and Mis logros does not open

### Requirement: Go to the Jar
The Dock SHALL offer a "Frasco" (Jar) button that moves the view to the Jar.

#### Scenario: Jump to the Jar
- **WHEN** the user activates "Frasco" in the Dock
- **THEN** the view moves so the Jar is in the middle of the screen

### Requirement: Put a Card in the Jar from the editor
The Card editor SHALL offer "Llevar al frasco" (Put in the jar) as the non-drag way to the Jar. It SHALL follow the same rules as dropping: a finished Card or a Card without Items goes into the Jar and the editor closes; a Card with unchecked Items is refused with the same toast and the editor stays open. It SHALL be unavailable while the Card is empty.

#### Scenario: From the editor
- **WHEN** the user opens a finished Card and activates "Llevar al frasco"
- **THEN** the editor closes, the Card is in the Jar, and a toast reads "¡Al frasco!"

#### Scenario: Refused in the editor
- **WHEN** the user opens a Card with 3 unchecked Items and activates "Llevar al frasco"
- **THEN** the Card stays on the Desk, the editor stays open, and a toast reads "Te faltan 3 elementos"

### Requirement: Take a Card out of the Jar
Mis logros SHALL list every Card in the Jar, newest first, each with its title, its Area and when it went in ("hoy", "ayer", "hace N días"), and a "Devolver" (Take out) button. With no Card in the Jar it SHALL say that Cards dropped in the Jar show up there.

#### Scenario: List
- **WHEN** the Jar holds a Card from Trabajo put in yesterday, and the user opens Mis logros
- **THEN** the list shows that Card's title, "Trabajo · ayer" and "Devolver"

#### Scenario: Empty Jar
- **WHEN** the Jar is empty and the user opens Mis logros
- **THEN** the list reads "Cuando lleves una tarjeta al frasco, aparece acá."

### Requirement: Devolver puts the Card back
"Devolver" SHALL put the Card back on the Desk inside its Area, drawn above the other Cards, and show "Volvió al escritorio". A finished Card SHALL keep its Card Win. A Card without Items SHALL lose the Card Win it got from the Jar.

#### Scenario: Take out a finished Card
- **WHEN** the user activates "Devolver" on a finished Card from Vida
- **THEN** the Card is back on the Desk inside Vida, on top, and the Cards finished count is unchanged

#### Scenario: Take out a Card without Items
- **WHEN** the user activates "Devolver" on a Card without Items
- **THEN** the Card is back on the Desk and one Card finished less is counted

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
