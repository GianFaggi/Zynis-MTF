# Spec Delta

## Purpose

Defines the Cards on the Desk: how the user writes them (title, text, checklist, pin), changes and deletes them, checks their Items, moves them between Areas by dragging or with the Place selector, and finds them where they left them after a reload.

## ADDED Requirements

### Requirement: Create a Card
The user SHALL be able to create a Card with the floating `+` button, which places it at the center of the view, and on PC by double-clicking empty paper, which places it there. A new Card SHALL open in the editor with the title field focused and SHALL belong to the Area it was placed in.

#### Scenario: Create with the + button
- **WHEN** the user activates the `+` button while looking at the Area Vida
- **THEN** a new Card appears in the middle of the view, in Vida's color
- **AND** the editor opens with the title field focused

#### Scenario: Create by double-click
- **WHEN** the user double-clicks empty paper inside the Area Recordar
- **THEN** a new Card appears where they double-clicked and belongs to Recordar

### Requirement: Empty new Cards are discarded
When the editor of a Card closes and the Card has no title, no text and no Item with text, the Card SHALL be removed instead of left blank on the Desk.

#### Scenario: Close without writing
- **WHEN** the user creates a Card and closes the editor without writing anything
- **THEN** no new Card remains on the Desk

### Requirement: Edit a Card
Tapping or clicking a Card, or pressing `Enter` on a focused Card, SHALL open it in the editor. The editor SHALL edit the title, the free text and the checklist, show the Card's Area color, and save every change as it is made. It SHALL close with its close button, its "Guardar" (Save) button, `Esc` and by tapping outside it. The button is named Save, not Done, so it never reads as finishing the Card.

#### Scenario: Open and edit
- **WHEN** the user taps a Card, changes its title and closes the editor
- **THEN** the Card on the Desk shows the new title

#### Scenario: Keyboard
- **WHEN** a Card has keyboard focus and the user presses `Enter`
- **THEN** the editor opens for that Card

### Requirement: Checklist in the editor
In the editor the user SHALL be able to change an Item's text, check or uncheck it, and remove it. Items whose text is left empty SHALL be dropped when the editor closes.

#### Scenario: Remove an Item
- **WHEN** the user removes the Item "Pan"
- **THEN** the Card no longer has it

#### Scenario: Blank Item
- **WHEN** the user clears an Item's text and closes the editor
- **THEN** that Item is gone

### Requirement: Add an Item
"Añadir elemento" (Add item) SHALL open a new empty Item at the end of the list with the cursor in it. What the user types there SHALL be the Item, saved as it is typed, with no separate draft to confirm. `Enter`, or the phone keyboard's confirm key, SHALL finish the Item and put the keyboard away. An Item left without text SHALL be removed when it loses focus.

#### Scenario: Add Items
- **WHEN** the user activates "Añadir elemento", types "Pan" and presses `Enter`, then does the same with "Leche"
- **THEN** the Card has the Items "Pan" and "Leche", unchecked, in that order
- **AND** after each `Enter` the keyboard is put away

#### Scenario: Save right after typing
- **WHEN** the user activates "Añadir elemento", types "Pan" and activates "Guardar" without pressing `Enter`
- **THEN** the Card has the Item "Pan"

#### Scenario: Opened and left empty
- **WHEN** the user activates "Añadir elemento" and moves elsewhere without typing
- **THEN** no empty Item remains

### Requirement: Card on the Desk
A Card on the Desk SHALL show its title, its text (shortened when long), up to five Items with a "+N más" line for the rest, the number of checked Items over the total when it has Items, and a pin mark when pinned. It SHALL be tinted with its Area's color.

#### Scenario: Long checklist
- **WHEN** a Card has 7 Items, 2 of them checked
- **THEN** it shows the first 5 Items, "+2 más" and "2/7"

### Requirement: Check Items on the Desk
The user SHALL be able to check and uncheck an Item by tapping its box on the Card on the Desk, without opening the editor. Tapping the box SHALL never start moving the Card.

#### Scenario: Check from the Desk
- **WHEN** the user taps the box of an unchecked Item on a Card
- **THEN** the Item is checked and struck through, and the editor does not open

#### Scenario: Uncheck
- **WHEN** the user taps the box of a checked Item
- **THEN** the Item is unchecked

### Requirement: Pin a Card
The editor SHALL let the user pin and unpin a Card. A pinned Card SHALL show a pin mark, and Tidy up SHALL place it before the unpinned Cards of its Area.

#### Scenario: Pin
- **WHEN** the user activates "Fijar" (Pin) in the editor
- **THEN** the button shows the Card as pinned and the Card shows a pin mark on the Desk

### Requirement: Delete a Card
The editor SHALL offer "Borrar" (Delete), which asks for a second tap ("¿Borrar? Tocá otra vez") before removing the Card and closing the editor.

#### Scenario: Delete with confirmation
- **WHEN** the user activates Delete twice
- **THEN** the Card is removed from the Desk and the editor closes

#### Scenario: One tap is not enough
- **WHEN** the user activates Delete once and then closes the editor
- **THEN** the Card is still on the Desk

### Requirement: Drag a Card with the mouse
On PC the user SHALL move a Card by pressing on it and dragging more than a few pixels. While lifted, the Card SHALL look raised and follow the pointer. A click without movement SHALL open the editor instead.

#### Scenario: Mouse drag
- **WHEN** the user presses on a Card and drags it 300 px to the right
- **THEN** the Card follows the pointer and stays where it is released

#### Scenario: Click opens
- **WHEN** the user clicks a Card without moving
- **THEN** the editor opens and the Card does not move

### Requirement: Press and hold to drag on touch
On touch the user SHALL move a Card by pressing and holding it for about a third of a second, then dragging. A finger that moves before the hold completes SHALL pan the Desk instead. A short tap SHALL open the editor. Where supported, the device SHALL vibrate briefly when the Card is picked up.

#### Scenario: Hold then drag
- **WHEN** the user holds a finger on a Card until it lifts, then drags it
- **THEN** the Card moves with the finger and stays where it is released

#### Scenario: Quick swipe pans
- **WHEN** the user swipes quickly across a Card without holding first
- **THEN** the Desk pans and the Card does not move

#### Scenario: Tap opens
- **WHEN** the user taps a Card briefly
- **THEN** the editor opens

### Requirement: Area on drop
When a dragged Card is released, it SHALL belong to the Area its center lands in, or to the nearest Area when it lands outside all of them, and take that Area's color. While the Card is dragged it SHALL already show the color of the Area it would join.

#### Scenario: Drop in another Area
- **WHEN** the user drags a Card from Trabajo and releases it over Vida
- **THEN** the Card belongs to Vida, shows Vida's color, and the Card counts of both Areas update

#### Scenario: Drop outside every Area
- **WHEN** the user releases a Card on empty paper outside every Area, closest to Recordar
- **THEN** the Card stays where it was released and belongs to Recordar

#### Scenario: Color preview
- **WHEN** the user drags a Card from Trabajo over Vida without releasing it
- **THEN** the Card already shows Vida's color

### Requirement: Last moved Card on top
A Card that is moved, by dragging or with the Place selector, SHALL be drawn above every other Card, and keep that order after a reload.

#### Scenario: Drop over another Card
- **WHEN** the user drops a Card so that it overlaps another Card
- **THEN** the dropped Card is drawn on top, also after a reload

### Requirement: Place selector
The editor SHALL show a "Lugar" (Place) selector listing every Area, with the Card's current Area selected. Choosing another Area SHALL move the Card to a free-looking spot inside that Area and give it that Area's color, without dragging.

#### Scenario: Move without dragging
- **WHEN** the user opens a Card in Trabajo and picks "Recordar" in Place
- **THEN** the Card moves inside the Area Recordar, takes its color, and the editor shows Recordar's tint

### Requirement: Cancelled drag
When a drag is interrupted by the system (for example an incoming call, or a second finger starting a pinch), the Card SHALL return to where the drag started and keep its Area.

#### Scenario: Second finger
- **WHEN** the user is dragging a Card and puts a second finger down to pinch
- **THEN** the Card goes back to where it was and the Desk zooms instead

### Requirement: The Desk survives a reload
Every Card's content, Area, position, tilt and stacking order, and every Area, SHALL be saved as soon as it changes and restored exactly after a reload.

#### Scenario: Reload after moving
- **WHEN** the user drags a Card to a new place in another Area and reloads MTF
- **THEN** the Card is in the same place, in the same Area, with the same content

#### Scenario: Reload after editing
- **WHEN** the user types a title in the editor and reloads MTF without pressing Done
- **THEN** the Card shows the typed title
