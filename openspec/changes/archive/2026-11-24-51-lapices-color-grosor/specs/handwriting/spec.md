# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Handwriting in both languages
Every label of this capability (the setting, "A mano", "Deshacer", "Borrador", "Borrar todo", its confirmation, the full message, the box's accessible name, the pens' names, the pen editor's title, color, widths, its width slider and "Listo") SHALL be shown in Spanish or English, following the UI language.

#### Scenario: English
- **WHEN** the UI language is English and the user opens a Card with handwriting
- **THEN** the box's tools read "Undo", "Eraser" and "Clear all"

#### Scenario: English pens
- **WHEN** the UI language is English and the user opens the editor of the chosen Tinta
- **THEN** the pen reads "Ink" and its widths read "Fine", "Medium" and "Bold"
