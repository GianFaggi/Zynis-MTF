# wins Specification

## Purpose

Defines what counts as a Win and when it is recorded or removed, the always-visible wins counter, and Mis logros, the view that shows the user's effort. It only counts up and never punishes quiet days.

## Requirements

### Requirement: Checking an Item is a Win
Checking an Item, on the Desk or in the editor, SHALL record one Win with the moment it happened. Unchecking that Item SHALL remove the most recent Win recorded for it, so checking and unchecking the same Item never adds up.

#### Scenario: Check an Item
- **WHEN** the user checks the Item "Pan"
- **THEN** one more thing done is counted for today

#### Scenario: Uncheck it again
- **WHEN** the user checks the Item "Pan" and then unchecks it
- **THEN** the count of things done is back to what it was before

#### Scenario: Check, uncheck, check
- **WHEN** the user checks, unchecks and checks the Item "Pan" again
- **THEN** exactly one Win is counted for "Pan"

### Requirement: Finishing a Card is a Win
A Card on the Desk SHALL have one Card Win exactly while it is finished. When it becomes finished (by checking its last unchecked Item, or by removing it), MTF SHALL record its Card Win, in addition to any Item Win. A Card SHALL never have more than one Card Win.

#### Scenario: Check the last Item
- **WHEN** a Card has the Items "Pan" (checked) and "Leche" (unchecked), and the user checks "Leche"
- **THEN** two more things done are counted: the Item and the finished Card

#### Scenario: Remove the last unchecked Item
- **WHEN** a Card has the Items "Pan" (checked) and "Leche" (unchecked), and the user removes "Leche"
- **THEN** the Card is finished and one Card Win is counted

#### Scenario: Finished twice
- **WHEN** the user finishes a Card, unchecks one of its Items and checks it again
- **THEN** the Card is counted as finished once

### Requirement: Unfinishing a Card removes its Win
When a Card on the Desk stops being finished, by unchecking one of its Items or by adding an Item with text that is not checked, its Card Win SHALL be removed. The Wins of its checked Items SHALL stay: they count the part of the Card that is done.

#### Scenario: Uncheck an Item of a finished Card
- **WHEN** a Card has all its Items checked and the user unchecks one of them
- **THEN** the count of things done drops by two: the Item and the Card

#### Scenario: Add an Item to a finished Card
- **WHEN** a finished Card has 2 checked Items and the user adds the Item "Manteca"
- **THEN** the Card Win is removed and the 2 Item Wins are still counted

#### Scenario: Finish it again
- **WHEN** the user then checks "Manteca"
- **THEN** the Card Win is counted again, once

### Requirement: A new Card counts as a note written
When the editor of a newly created Card closes and the Card is kept, MTF SHALL record one note written. Notes written SHALL be shown on their own and SHALL NOT be counted as things done. Editing an existing Card SHALL NOT record a note.

#### Scenario: Write a new Card
- **WHEN** the user creates a Card, types a title and closes the editor
- **THEN** one more note written is counted and the things done stay the same

#### Scenario: A new Card left empty
- **WHEN** the user creates a Card and closes the editor without writing anything
- **THEN** no note written is counted

#### Scenario: Edit an old Card
- **WHEN** the user opens an existing Card, changes its text and closes the editor
- **THEN** no note written is counted

### Requirement: Wins go away with what they count
Deleting a Card SHALL remove every Win and note written recorded for it. Removing a checked Item from a Card, including a checked Item whose text is left empty when the editor closes, SHALL remove that Item's Win. Changing a Card's title or text SHALL NOT remove anything, and Wins SHALL NEVER be removed by the passing of time.

#### Scenario: Delete a finished Card
- **WHEN** the user finishes a Card with 2 Items and then deletes it
- **THEN** its 2 Item Wins, its Card Win and its note written are no longer counted

#### Scenario: Remove a checked Item
- **WHEN** the user removes a checked Item from a Card in the editor
- **THEN** that Item's Win is no longer counted

#### Scenario: Edit the title
- **WHEN** the user changes the title of a finished Card
- **THEN** every Win of that Card is still counted

#### Scenario: Old Wins
- **WHEN** a Win was recorded months ago and the Card still exists
- **THEN** it still counts since you started

### Requirement: Wins are kept
Every Win and note written SHALL be saved as soon as it is recorded and SHALL be restored after a reload, with the moment it happened.

#### Scenario: Reload
- **WHEN** the user checks two Items and reloads MTF
- **THEN** Mis logros still counts those two things done today

### Requirement: Last 7 days
"The last 7 days" SHALL mean today plus the six previous calendar days, in the device's local time. A Win from earlier than that SHALL still count toward the total since you started.

#### Scenario: A Win from 6 days ago
- **WHEN** a Win was recorded six calendar days before today
- **THEN** it is counted in the last 7 days

#### Scenario: A Win from 7 days ago
- **WHEN** a Win was recorded seven calendar days before today
- **THEN** it is not counted in the last 7 days but is counted since you started

### Requirement: Wins counter
A wins counter SHALL always be visible in the floating tools, showing the number of things done in the last 7 days, with an accessible name that says what the number is. Activating it SHALL open Mis logros. Each new Win SHALL make it bump briefly. With no recent Wins it SHALL show 0, with no other message.

#### Scenario: Counter shows the week
- **WHEN** the last 7 days hold 3 Item Wins and 1 Card Win
- **THEN** the counter shows 4 and its accessible name reads "Mis logros: 4 cosas hechas en 7 días"

#### Scenario: Open Mis logros
- **WHEN** the user activates the wins counter
- **THEN** the Mis logros sheet opens

#### Scenario: Counter updates
- **WHEN** the user checks an Item
- **THEN** the counter goes up by one

### Requirement: Mis logros
Mis logros SHALL open as a sheet over the Desk. It SHALL show the number of things done in the last 7 days as its main number, broken down into Items checked and Cards finished, plus notes written in a quieter style. It SHALL close like the other sheets: close button, `Esc`, or tapping outside it.

#### Scenario: Week summary
- **WHEN** the last 7 days hold 5 Item Wins, 2 Card Wins and 3 notes written, and the user opens Mis logros
- **THEN** the main number is 7, with 5 Items checked, 2 Cards finished and 3 notes written

#### Scenario: Close with Esc
- **WHEN** Mis logros is open and the user presses `Esc`
- **THEN** the sheet closes

### Requirement: A bar per day
Mis logros SHALL show one bar per day for the last 7 days, oldest first and today last, each labeled with its weekday and with its number of things done. Today's bar SHALL use the accent color. A day with nothing done SHALL show no bar and no message about it.

#### Scenario: Bars for the week
- **WHEN** the user did 2 things on Monday and 4 today, and opens Mis logros
- **THEN** Monday's bar shows 2, today's bar shows 4 in the accent color, and the other days have no bar

#### Scenario: Accessible chart
- **WHEN** a screen reader reaches the chart
- **THEN** it is announced as "Cosas hechas por día, últimos 7 días"

### Requirement: Best day and quiet days
Below the bars, Mis logros SHALL name the user's best day of the last 7 days and its count, followed by "Los días tranquilos también cuentan". With nothing done in the last 7 days it SHALL show only "Los días tranquilos también cuentan". It SHALL never mention streaks or days without Wins.

#### Scenario: A best day
- **WHEN** the user's best day of the week was Tuesday with 6 things done
- **THEN** Mis logros reads "Tu mejor día fue el martes, con 6. Los días tranquilos también cuentan."

#### Scenario: A quiet week
- **WHEN** nothing was done in the last 7 days
- **THEN** Mis logros reads "Los días tranquilos también cuentan." and shows no warning or empty-state scolding

### Requirement: Since you started
Mis logros SHALL show the total number of things done since the user started using MTF.

#### Scenario: Total
- **WHEN** the user has 120 things done in total, 9 of them in the last 7 days
- **THEN** Mis logros reads "Desde que empezaste: 120 cosas hechas."
