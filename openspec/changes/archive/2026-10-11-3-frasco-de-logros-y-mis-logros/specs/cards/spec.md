# Spec Delta

## ADDED Requirements

### Requirement: Finished Card
A Card SHALL be finished when it has at least one Item with text and all of those Items are checked. A Card without Items SHALL never be finished. Checking the last unchecked Item of a Card, on the Desk or in the editor, SHALL show a toast "¡Tarjeta completa!" with "Arrastrala al frasco cuando quieras", and sparks unless reduced motion is on.

#### Scenario: Last Item checked
- **WHEN** a Card has the Items "Pan" (checked) and "Leche" (unchecked), and the user checks "Leche"
- **THEN** the Card is finished
- **AND** a toast reads "¡Tarjeta completa!" and "Arrastrala al frasco cuando quieras"

#### Scenario: No Items
- **WHEN** a Card has only a title and text
- **THEN** it is not finished

#### Scenario: A new unchecked Item
- **WHEN** the user adds the Item "Manteca" to a finished Card
- **THEN** the Card is no longer finished

#### Scenario: Finished by removing an Item
- **WHEN** the user removes the only unchecked Item of a Card whose other Items are checked
- **THEN** the Card is finished, without the "¡Tarjeta completa!" toast (that celebration belongs to checking)

## MODIFIED Requirements

### Requirement: Card on the Desk
A Card on the Desk SHALL show its title, its text (shortened when long), up to five Items with a "+N más" line for the rest, the number of checked Items over the total when it has Items, and a pin mark when pinned. It SHALL be tinted with its Area's color. A finished Card SHALL show a "Llevala al frasco" chip in the accent color in place of the checked count, and SHALL stand out with the accent: a warmed fill, an accent border with a soft halo, its title in the accent and a seal with a check on its corner, with none of its content faded. Cards in the Jar SHALL NOT be shown on the Desk.

#### Scenario: Long checklist
- **WHEN** a Card has 7 Items, 2 of them checked
- **THEN** it shows the first 5 Items, "+2 más" and "2/7"

#### Scenario: Finished Card chip
- **WHEN** every Item of a Card is checked
- **THEN** the Card shows "Llevala al frasco" in the accent color instead of the checked count

#### Scenario: Chip goes away
- **WHEN** the user unchecks one Item of a finished Card
- **THEN** the chip is replaced by the checked count again

#### Scenario: A finished Card stands out
- **WHEN** a Card on the Desk is finished
- **THEN** its fill is warmed with the accent, it has an accent border with a soft halo, its title is in the accent, and a round seal with a check sits on its top-right corner, also when the Desk is zoomed out
- **AND** none of its content is faded

#### Scenario: A pinned finished Card
- **WHEN** a finished Card is also pinned
- **THEN** the pin mark moves to the left of the seal, and both stay visible

#### Scenario: The finish is celebrated once
- **WHEN** the user checks the last unchecked Item of a Card on the Desk
- **THEN** the Card grows a little and settles back, and the seal stamps onto its corner
- **AND** this does not play again when MTF reloads, nor when a Card becomes finished by removing an Item, nor at all under reduced motion
