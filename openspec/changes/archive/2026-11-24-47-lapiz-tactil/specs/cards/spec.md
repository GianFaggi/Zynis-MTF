# Spec Delta

## MODIFIED Requirements

### Requirement: Empty new Cards are discarded
When the editor of a Card closes and the Card has no title, no text, no Item with text and no handwriting, the Card SHALL be removed instead of left blank on the Desk. A Card is empty, for this and for the Jar, only when it has none of the four.

#### Scenario: Close without writing
- **WHEN** the user creates a Card and closes the editor without writing anything
- **THEN** no new Card remains on the Desk

#### Scenario: Only handwriting
- **WHEN** the user creates a Card, writes only in its handwriting box and closes the editor
- **THEN** the Card stays on the Desk and counts as a note written

#### Scenario: Only handwriting goes to the Jar
- **WHEN** a Card has only handwriting and the user opens its editor
- **THEN** "Llevar al frasco" is available

### Requirement: Card on the Desk
A Card on the Desk SHALL show its title, its text (shortened when long), its handwriting scaled down to the Card's width (cut off when tall), up to five Items with a "+N más" line for the rest, the number of checked Items over the total when it has Items, and a pin mark when pinned. It SHALL be tinted with its Area's color. A finished Card SHALL show a "Llevala al frasco" chip in the accent color in place of the checked count, and SHALL stand out with the accent: a warmed fill, an accent border with a soft halo, its title in the accent and a seal with a check on its corner, with none of its content faded. Cards in the Jar SHALL NOT be shown on the Desk.

#### Scenario: Long checklist
- **WHEN** a Card has 7 Items, 2 of them checked
- **THEN** it shows the first 5 Items, "+2 más" and "2/7"

#### Scenario: Handwriting on the Card
- **WHEN** a Card has a title, text and handwriting
- **THEN** the Card shows the title, then the text, then the handwriting scaled down to the Card's width, then its Items

#### Scenario: Tall handwriting
- **WHEN** a Card's handwriting is much taller than it is wide
- **THEN** the Card shows its top part and fades it out, and the editor shows all of it

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
