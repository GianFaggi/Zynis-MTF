# Spec Delta

## Purpose

Defines the Jar: the place on the Desk where the user puts Cards they are done with. It covers where the Jar sits, which Cards it accepts or refuses, how it fills up, and how Cards come back out of it.

## ADDED Requirements

### Requirement: The Jar on the Desk
The Jar SHALL sit on the Desk, centered below the Areas, with a caption showing the things done this week and that tapping it shows more. It SHALL pan and zoom with the Desk like everything on it, and stay where it is when Cards are moved or tidied up.

#### Scenario: Default Desk
- **WHEN** MTF opens with the three default Areas
- **THEN** the Jar is drawn below the Area Vida, with the caption "Tu frasco" and "N esta semana · tocalo para ver más"

#### Scenario: Zooming
- **WHEN** the user zooms the Desk out
- **THEN** the Jar shrinks with the Desk and stays below the Areas

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
