# Spec Delta

## Purpose

Lets a Card hold handwriting, written with an Apple Pencil, a graphics tablet pen, a mouse or a finger, and kept exactly as drawn. It covers the device setting that offers it, the handwriting box in the editor, its tools, and how handwriting looks wherever a Card appears.

## ADDED Requirements

### Requirement: Handwriting setting
Settings SHALL offer "Escritura a mano" (EN "Handwriting") with No / Sí, off by default. It SHALL be remembered on the device across reloads, like the theme. It is a device setting: it SHALL NOT be part of the data document, a Backup or sync, and an Import SHALL leave it as it was.

#### Scenario: Off on a new device
- **WHEN** MTF opens for the first time on a device
- **THEN** "Escritura a mano" is set to No

#### Scenario: Remembered
- **WHEN** the user turns "Escritura a mano" on and reloads MTF
- **THEN** it is still on

#### Scenario: An Import does not change it
- **WHEN** "Escritura a mano" is on and the user imports a Backup
- **THEN** it is still on after the Import

### Requirement: Adding a handwriting box
While "Escritura a mano" is on, the editor of a Card without handwriting SHALL offer "A mano" (EN "Handwriting"), placed with "Añadir elemento". Choosing it SHALL add an empty handwriting box below the Card's text, ready to write in. While the setting is off, the editor SHALL NOT offer it.

#### Scenario: Setting off
- **WHEN** "Escritura a mano" is off and the user opens a Card without handwriting
- **THEN** the editor looks as it did before this change, with no handwriting offer

#### Scenario: Add a box
- **WHEN** "Escritura a mano" is on and the user chooses "A mano" in the editor
- **THEN** an empty handwriting box appears below the text, and "A mano" is no longer offered for that Card

### Requirement: Existing handwriting is always shown
Handwriting a Card already has SHALL be shown on the Desk and in the editor, and SHALL stay editable, whatever the setting. Turning the setting off SHALL only remove the offer to add a box.

#### Scenario: Setting turned off
- **WHEN** a Card has handwriting and the user turns "Escritura a mano" off
- **THEN** the Card still shows its handwriting on the Desk, and its editor still shows the box with its tools

#### Scenario: Handwriting from another device
- **WHEN** a Card with handwriting arrives by sync or Import on a device where the setting is off
- **THEN** the Card shows its handwriting

### Requirement: Writing in the box
A pen or a mouse pressed in the handwriting box SHALL draw a stroke that follows it until it lifts. Where the device reports pen pressure, the stroke SHALL be thicker where the pen presses harder. Each stroke SHALL be saved when it ends and restored exactly after a reload.

#### Scenario: Apple Pencil
- **WHEN** the user writes a word with an Apple Pencil in the box
- **THEN** the word appears as drawn, with thicker lines where the Pencil pressed harder

#### Scenario: Graphics tablet
- **WHEN** the user writes with a graphics tablet pen in the box on a PC
- **THEN** the strokes appear where the pen's pointer moved

#### Scenario: Mouse
- **WHEN** the user drags the mouse in the box
- **THEN** a stroke of even thickness follows it

#### Scenario: Kept after a reload
- **WHEN** the user writes in the box, closes the editor and reloads MTF
- **THEN** the Card's handwriting is exactly as written

### Requirement: The finger draws until a pen is seen
A finger in the handwriting box SHALL draw like a pen without pressure, until the box receives a pen. From then on, until the editor closes, a finger in the box SHALL draw nothing, and a finger stroke still being drawn when the pen touches SHALL be discarded.

#### Scenario: Phone without a pen
- **WHEN** the user writes with a finger in the box on a phone
- **THEN** the strokes are drawn and kept

#### Scenario: Palm on an iPad
- **WHEN** the user has written with the Apple Pencil and rests a palm on the box while writing more
- **THEN** the palm leaves no mark

#### Scenario: Palm first
- **WHEN** the palm touches the box just before the Pencil does
- **THEN** whatever the palm had started drawing is removed, and only the Pencil's stroke is kept

#### Scenario: A new editor
- **WHEN** the user closes the editor and opens a Card again
- **THEN** the finger draws again until a pen touches the box

### Requirement: Drawing stays in the box
A stroke started in the handwriting box SHALL NOT pan or zoom the Desk, move a Card, select text, open a system menu or close the editor, even when it leaves the box. On the Desk, a pen SHALL keep moving Cards and the Desk as the mouse does.

#### Scenario: Stroke leaving the box
- **WHEN** a stroke starts in the box and ends outside it, over the sheet
- **THEN** only the stroke is drawn, and the editor stays open

#### Scenario: Pen on the Desk
- **WHEN** the user presses a Card on the Desk with a pen and drags it
- **THEN** the Card moves, as with the mouse

### Requirement: Handwriting is kept as ink
Handwriting SHALL be kept and shown as drawn, in one ink color that follows the light or dark theme. MTF SHALL NOT turn it into text, and search SHALL NOT match it.

#### Scenario: Theme change
- **WHEN** a Card has handwriting and the user switches from the light to the dark theme
- **THEN** the handwriting stays readable in the dark theme's ink color

#### Scenario: Not searched
- **WHEN** the user searches for a word that appears only in a Card's handwriting
- **THEN** that Card is not a match

### Requirement: Same handwriting on every screen
Handwriting SHALL keep its proportions and its place in the box on every device and editor width, scaled to the width available.

#### Scenario: From iPad to phone
- **WHEN** the user writes in a Card on an iPad and opens it on a phone
- **THEN** the phone shows the same handwriting, smaller, with the same layout

### Requirement: Undo
The handwriting box SHALL offer "Deshacer" (EN "Undo"), which takes back the last stroke drawn, erased or cleared since the editor opened, one at a time. It SHALL be disabled when there is nothing to take back.

#### Scenario: Undo a stroke
- **WHEN** the user draws two strokes and chooses "Deshacer"
- **THEN** only the first stroke remains

#### Scenario: Undo an erase
- **WHEN** the user erases a stroke and chooses "Deshacer"
- **THEN** the stroke comes back

#### Scenario: Nothing to undo
- **WHEN** the editor has just opened
- **THEN** "Deshacer" is disabled

### Requirement: Eraser
The handwriting box SHALL offer "Borrador" (EN "Eraser"). While it is chosen, a pen, the mouse or the finger passing over a stroke SHALL remove that whole stroke, and choosing it again SHALL go back to writing. The eraser end of a tablet pen SHALL erase in the same way without choosing the tool.

#### Scenario: Erase a stroke
- **WHEN** the user chooses "Borrador" and passes over one stroke
- **THEN** that whole stroke is removed and the others stay

#### Scenario: Pen eraser end
- **WHEN** the user turns a graphics tablet pen around and rubs its eraser over a stroke
- **THEN** that stroke is removed, and the box is still in writing mode for the tip

### Requirement: Clear all
The handwriting box SHALL offer "Borrar todo" (EN "Clear all"), which asks for a second tap ("¿Borrar todo? Tocá otra vez") before removing every stroke. "Deshacer" SHALL bring them back.

#### Scenario: Clear and undo
- **WHEN** the user taps "Borrar todo" twice and then "Deshacer"
- **THEN** every stroke is removed and then comes back

#### Scenario: Single tap
- **WHEN** the user taps "Borrar todo" once and then draws
- **THEN** no stroke is removed and the confirmation goes away

### Requirement: The box grows
When a stroke ends near the bottom of the handwriting box, the box SHALL grow downwards to leave room for more, up to a maximum height. Growing SHALL NOT move or rescale the strokes already drawn.

#### Scenario: Writing to the bottom
- **WHEN** the user writes a line near the bottom of the box
- **THEN** the box grows taller and the earlier strokes stay where they were

#### Scenario: Maximum height
- **WHEN** the box has reached its maximum height
- **THEN** it does not grow further, and the user can still write in it

### Requirement: Handwriting has a limit
A Card's handwriting SHALL have a size limit, so one Card cannot fill the device's storage or slow sync down. When a stroke would pass the limit, it SHALL NOT be kept, and the box SHALL say that it is full ("Esta escritura está completa", EN "This handwriting is full"). Erasing SHALL make room again.

#### Scenario: Full
- **WHEN** a Card's handwriting has reached the limit and the user draws another stroke
- **THEN** the stroke is not kept and the box says it is full

#### Scenario: Room again
- **WHEN** the user erases strokes from a full box and draws again
- **THEN** the new stroke is kept

### Requirement: An empty box goes away
When the editor closes and the handwriting box has no stroke, the Card SHALL have no handwriting, and "A mano" SHALL be offered again while the setting is on.

#### Scenario: Box added and left empty
- **WHEN** the user adds a box, draws nothing and closes the editor
- **THEN** the Card has no handwriting and looks as before

#### Scenario: Everything erased
- **WHEN** the user clears every stroke and closes the editor
- **THEN** the Card has no handwriting

### Requirement: Naming a Card that has only handwriting
Wherever MTF names a Card by its title, text or Items (its accessible name on the Desk, the Jar list in Mis logros), a Card with none of them but with handwriting SHALL be named "Escritura a mano" (EN "Handwriting"). The handwriting box SHALL have an accessible name too.

#### Scenario: Jar list
- **WHEN** a Card with only handwriting is in the Jar and the user opens Mis logros
- **THEN** its row reads "Escritura a mano"

### Requirement: Handwriting in both languages
Every label of this capability (the setting, "A mano", "Deshacer", "Borrador", "Borrar todo", its confirmation, the full message and the box's accessible name) SHALL be shown in Spanish or English, following the UI language.

#### Scenario: English
- **WHEN** the UI language is English and the user opens a Card with handwriting
- **THEN** the box's tools read "Undo", "Eraser" and "Clear all"
