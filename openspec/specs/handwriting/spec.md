# handwriting Specification

## Purpose
Lets a Card hold handwriting, written with an Apple Pencil, a graphics tablet pen, a mouse or a finger, and kept exactly as drawn. It covers the device setting that offers it, the handwriting box in the editor, its tools, and how handwriting looks wherever a Card appears.

## Requirements

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
A pen or a mouse pressed in the handwriting box SHALL draw a stroke that follows it until it lifts, in the chosen pen's color and width. Where the device reports pen pressure, the stroke SHALL be thicker where the pen presses harder, within that width. Each stroke SHALL be saved when it ends and restored exactly after a reload.

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

#### Scenario: Width and pressure
- **WHEN** the user writes with a pen set to "Grueso" and then with one set to "Fino", pressing the same way
- **THEN** the "Grueso" strokes are thicker, and both get thicker where the pen pressed harder

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
Handwriting SHALL be kept and shown as drawn. Strokes drawn with Tinta SHALL use the ink color of the light or dark theme. Strokes drawn with another pen SHALL keep that pen's color, the same in both themes: MTF SHALL NOT adjust it. MTF SHALL NOT turn handwriting into text, and search SHALL NOT match it.

#### Scenario: Theme change
- **WHEN** a Card has handwriting in Tinta and the user switches from the light to the dark theme
- **THEN** the handwriting stays readable in the dark theme's ink color

#### Scenario: A chosen color in the dark theme
- **WHEN** a Card has strokes drawn with a dark blue pen and the user switches to the dark theme
- **THEN** those strokes are still the same dark blue

#### Scenario: Not searched
- **WHEN** the user searches for a word that appears only in a Card's handwriting
- **THEN** that Card is not a match

### Requirement: Same handwriting on every screen
Handwriting SHALL keep its proportions and its place in the box on every device and editor width, scaled to the width available.

#### Scenario: From iPad to phone
- **WHEN** the user writes in a Card on an iPad and opens it on a phone
- **THEN** the phone shows the same handwriting, smaller, with the same layout

### Requirement: Undo
The handwriting box SHALL offer "Deshacer" (EN "Undo"), which takes back the last stroke drawn, erased or cleared since the editor opened, one at a time. It SHALL be disabled when there is nothing to take back. Choosing or editing a pen SHALL NOT be a step to take back. On a keyboard, Ctrl+Z (⌘Z on a Mac) SHALL do the same while the box is shown, except when the focus is in a text field, where it keeps undoing what was typed.

#### Scenario: Undo with the keyboard
- **WHEN** the user draws two strokes with the mouse and presses Ctrl+Z
- **THEN** only the first stroke remains

#### Scenario: Ctrl+Z in a text field undoes typing
- **WHEN** the user has drawn a stroke, types in the Card's text and presses Ctrl+Z there
- **THEN** the typing is undone and the stroke stays

#### Scenario: Undo a stroke
- **WHEN** the user draws two strokes and chooses "Deshacer"
- **THEN** only the first stroke remains

#### Scenario: Undo an erase
- **WHEN** the user erases a stroke and chooses "Deshacer"
- **THEN** the stroke comes back

#### Scenario: Nothing to undo
- **WHEN** the editor has just opened
- **THEN** "Deshacer" is disabled

#### Scenario: Undo after editing a pen
- **WHEN** the user draws a stroke, changes the chosen pen's color and chooses "Deshacer"
- **THEN** the stroke is removed and the pen keeps its new color

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
Every label of this capability (the setting, "A mano", "Deshacer", "Borrador", "Borrar todo", its confirmation, the full message, the box's accessible name, the pens' names, the pen editor's title, color, widths, its width slider and "Listo") SHALL be shown in Spanish or English, following the UI language.

#### Scenario: English
- **WHEN** the UI language is English and the user opens a Card with handwriting
- **THEN** the box's tools read "Undo", "Eraser" and "Clear all"

#### Scenario: English pens
- **WHEN** the UI language is English and the user opens the editor of the chosen Tinta
- **THEN** the pen reads "Ink" and its widths read "Fine", "Medium" and "Bold"

### Requirement: Pens
The handwriting box SHALL offer four pens: "Tinta" (EN "Ink") first, and three more ("Lápiz 2", "Lápiz 3", "Lápiz 4"; EN "Pen 2", "Pen 3", "Pen 4"). Each pen has a color and a width, shown on its button. Exactly one pen is chosen, Tinta on a new device. A tap on another pen SHALL choose it, and the next strokes SHALL be drawn with its color and width. Choosing a pen while the eraser is on SHALL turn the eraser off.

#### Scenario: A new device
- **WHEN** the user opens a handwriting box for the first time on a device
- **THEN** four pens are shown and Tinta is chosen

#### Scenario: Choose a pen
- **WHEN** the user taps "Lápiz 3" and writes a word
- **THEN** the word is drawn in Lápiz 3's color and width

#### Scenario: Back from the eraser
- **WHEN** the eraser is on and the user taps a pen
- **THEN** the eraser is off, that pen is chosen and the next stroke draws

### Requirement: Editing a pen
A tap on the chosen pen SHALL open its editor, with the pen's width as "Fino", "Medio" or "Grueso" (EN "Fine", "Medium", "Bold"), or set step by step on a slider from 2 to 20, and, except for Tinta, its color, picked freely from any color. A change SHALL apply to the pen at once and to the strokes drawn after it. The editor SHALL close with "Listo" (EN "Done"), Esc, a press outside it, or a stroke in the box. Tinta's color SHALL NOT be editable: it always follows the theme.

#### Scenario: Change a pen's color
- **WHEN** the user taps the chosen Lápiz 2, picks green and writes
- **THEN** the new stroke is green, and Lápiz 2's button shows green

#### Scenario: Change Tinta's width
- **WHEN** the user taps the chosen Tinta and picks "Grueso"
- **THEN** the editor offers no color, and the next Tinta strokes are thicker

#### Scenario: Fine-tune the width step by step
- **WHEN** the user opens the chosen Lápiz 2's editor and moves the width slider one step past "Medio"
- **THEN** no preset shows as chosen, the editor shows the new width, and the next stroke is a little thicker than a "Medio" one

#### Scenario: A preset moves the slider
- **WHEN** the slider is between presets and the user picks "Grueso"
- **THEN** the slider moves to Grueso's step and "Grueso" shows as chosen

#### Scenario: A tap on another pen does not edit
- **WHEN** Tinta is chosen and the user taps Lápiz 2 once
- **THEN** Lápiz 2 is chosen and no editor opens

### Requirement: The pens stay on the device
The pens (their colors and widths) and which one is chosen SHALL be remembered on the device across Cards, editors and reloads, like the theme. They are a device setting: they SHALL NOT be part of the data document, a Backup or sync, and an Import SHALL leave them as they were.

#### Scenario: Another Card
- **WHEN** the user chooses Lápiz 4, closes the editor and opens another Card's handwriting box
- **THEN** Lápiz 4 is still chosen

#### Scenario: Reload
- **WHEN** the user changes Lápiz 2 to green and reloads MTF
- **THEN** Lápiz 2 is still green

#### Scenario: An Import does not change them
- **WHEN** the user has edited the pens and imports a Backup
- **THEN** the pens and the chosen pen are as they were before the Import

### Requirement: Each stroke keeps its style
A stroke SHALL keep the color and width it was drawn with: editing or choosing a pen later SHALL NOT change strokes already drawn. The style SHALL be kept after a reload and shown wherever the handwriting appears, in the editor and on the Card on the Desk.

#### Scenario: Edit the pen after writing
- **WHEN** the user writes a word with a blue Lápiz 2 and then changes Lápiz 2 to red
- **THEN** the word stays blue and the next strokes are red

#### Scenario: On the Desk
- **WHEN** a Card has strokes in three colors and the user closes the editor
- **THEN** the Card on the Desk shows them in the same three colors and widths

#### Scenario: Kept after a reload
- **WHEN** the user writes with several pens, closes the editor and reloads MTF
- **THEN** every stroke has the color and width it was drawn with

### Requirement: Handwriting from before pens
Strokes saved without a style SHALL be shown as Tinta at medium width, which is how all handwriting looked before pens. When the styles a Card's handwriting carries no longer match its strokes, as after an older version of MTF changed it, every stroke of that Card SHALL be shown as Tinta at medium width, never with a color on the wrong stroke.

#### Scenario: A Card from before
- **WHEN** the user opens a Card whose handwriting was written before pens existed
- **THEN** it looks exactly as before, in Tinta following the theme

#### Scenario: Changed by an older version
- **WHEN** a device still on a version without pens erases a stroke from a Card with colored strokes, and the Card syncs back
- **THEN** the Card shows every remaining stroke in Tinta at medium width
