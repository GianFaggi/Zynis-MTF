# areas Specification

## Purpose

Lets the user shape the Desk's Areas: create their own, rename and recolor any Area, move and resize them on the Desk, and delete them without losing a Card.

## Requirements

### Requirement: Area editor
MTF SHALL offer an Area editor sheet for one Area, with its name, its color and a delete action. Two things SHALL open it: an edit button with an accessible name next to the Area's label on the Desk (shown while the Desk shows Cards in full, not in far zoom), and the Area's row in the Areas section of Settings. The editor SHALL close like every other sheet: with its close button, with `Esc`, and by tapping outside it.

#### Scenario: Open from the Desk
- **WHEN** the user activates the edit button next to the label of the Area Vida
- **THEN** the Area editor opens for Vida, tinted in Vida's color

#### Scenario: Open from Settings
- **WHEN** the user opens Settings and activates the row of the Area Trabajo in the Areas section
- **THEN** Settings closes and the Area editor opens for Trabajo

#### Scenario: Close with Esc
- **WHEN** the Area editor is open and the user presses `Esc`
- **THEN** the editor closes and the Desk is shown

### Requirement: Areas section in Settings
The Settings sheet SHALL show an Areas section that lists every Area in Desk order, each with its color and name, and a "Nueva área" (New area) button.

#### Scenario: Default Areas listed
- **WHEN** the user opens Settings on a first launch
- **THEN** the Areas section lists Trabajo, Vida and Recordar with their colors, and a "Nueva área" button

### Requirement: Create an Area
"Nueva área" SHALL create a new Area right away, with the provisional name "Área nueva" (or "New area" in English) and the first Area color that no other Area uses (the first color when all are used). Settings SHALL close, the view SHALL fly to the new Area, and its Area editor SHALL open with the name selected so typing replaces it.

#### Scenario: Create and name
- **WHEN** the user activates "Nueva área" and types "Facu"
- **THEN** a new Area named "Facu" is on the Desk, in a color none of the other Areas uses, and the view shows it

#### Scenario: New Area everywhere
- **WHEN** the user has created the Area "Facu"
- **THEN** the Dock offers "Facu", the Place selector lists it, See all includes it, and a Card dropped inside it belongs to it

### Requirement: New Area placement
A new Area SHALL take the first free slot of a grid that continues the default row: 3 slots per row, read left to right and then row by row from the top, with the size and spacing of the default Areas. A slot SHALL be free when it does not overlap any existing Area. A new Area SHALL never overlap another Area.

#### Scenario: Fourth Area
- **WHEN** the Desk holds only the three default Areas in their original places and the user creates an Area
- **THEN** the new Area appears below Trabajo, at the start of a second row, overlapping no Area

#### Scenario: A freed slot is reused
- **WHEN** the user has deleted the Area Vida, leaving its slot empty, and creates an Area
- **THEN** the new Area takes the slot where Vida was

#### Scenario: The Jar moves below
- **WHEN** a new Area starts a second row
- **THEN** the Jar sits centered below the Areas, under the second row, overlapping no Area

### Requirement: Rename an Area
The user SHALL be able to rename any Area, the default ones included, from the Area editor. A custom name SHALL be shown exactly as typed, in Spanish and in English, on the Desk, in the Dock, in the Place selector, in Settings and in Mis logros. Leading and trailing spaces SHALL be dropped. Clearing the name of a default Area SHALL bring back its translated name; a custom Area SHALL keep its last name when its name is cleared.

#### Scenario: Rename a default Area
- **WHEN** the user renames Trabajo to "Oficina" and switches the language to English
- **THEN** the Area still reads "Oficina"

#### Scenario: Back to the default name
- **WHEN** the user clears the name of the renamed default Area "Oficina" and closes the editor
- **THEN** the Area reads "Trabajo" in Spanish and "Work" in English

#### Scenario: A custom Area keeps a name
- **WHEN** the user clears the name of the custom Area "Facu" and closes the editor
- **THEN** the Area still reads "Facu"

### Requirement: Area colors
MTF SHALL offer 12 Area colors: sage, sand, sky, plum, rose, teal, olive, slate, indigo, turquoise, pine and berry, each with a light and a dark theme value. None of them SHALL be the accent color, which stays reserved for wins. Two Areas MAY share a color.

#### Scenario: Twelve swatches
- **WHEN** the Area editor is open
- **THEN** it shows 12 color swatches, with the Area's current color marked as selected

### Requirement: Recolor an Area
Choosing a swatch in the Area editor SHALL change the Area's color at once. The Area's region and label, its Cards on the Desk, its pieces in the Jar, its Dock button and the editor's tint SHALL all take the new color.

#### Scenario: Cards follow the color
- **WHEN** the Area Vida holds 3 Cards on the Desk and 1 in the Jar, and the user picks teal for it
- **THEN** Vida's region, its 3 Cards and its piece in the Jar are teal

### Requirement: Move an Area
The user SHALL be able to move an Area by dragging its label: with a mouse or pen, after moving more than 4 px; on touch, after pressing and holding for 320 ms, then dragging. A touch that moves before the hold SHALL pan the Desk, and a short tap on the label SHALL still fly to the Area. While moving, the Area SHALL follow the pointer.

#### Scenario: Move with the mouse
- **WHEN** the user drags the label of the Area Recordar 600 px to the right with the mouse and releases it on empty paper
- **THEN** Recordar sits 600 px further right

#### Scenario: Press and hold on a phone
- **WHEN** the user presses and holds the label of the Area Vida for 320 ms and then drags it
- **THEN** the Area moves with the finger

#### Scenario: A swipe still pans
- **WHEN** the user swipes quickly across an Area label on a phone
- **THEN** the Desk pans and the Area stays where it was

#### Scenario: A tap still flies
- **WHEN** the user taps an Area label without moving
- **THEN** the view flies to that Area and the Area does not move

#### Scenario: Cancelled move
- **WHEN** the user is moving an Area and puts a second finger down to pinch
- **THEN** the Area and its Cards go back to where they were and the Desk zooms instead

### Requirement: Cards travel with their Area
When an Area is moved, every Card of that Area on the Desk SHALL move by the same distance, during the move and after it, and keep its Area, tilt and stacking order. Cards of other Areas SHALL NOT move, even when the moved Area ends up under them.

#### Scenario: The Cards come along
- **WHEN** the Area Trabajo holds 4 Cards and the user moves it 500 px down
- **THEN** the 4 Cards are 500 px further down, still in Trabajo

#### Scenario: Other Cards stay
- **WHEN** a Card of Vida sits outside every Area and the user moves Trabajo under it
- **THEN** that Card does not move and still belongs to Vida

### Requirement: Resize an Area
Each Area SHALL show a resize handle in its bottom-right corner while the Desk shows Cards in full (not in far zoom). Dragging the handle, with the mouse or on touch with no hold, SHALL change the Area's width and height, keeping its top-left corner in place, down to a minimum of 520 × 520 Desk px. Resizing SHALL NOT move any Card or change any Card's Area.

#### Scenario: Make an Area bigger
- **WHEN** the user drags the resize handle of the Area Vida 400 px right and 300 px down
- **THEN** Vida is 400 px wider and 300 px taller, and no Card moved

#### Scenario: Minimum size
- **WHEN** the user drags the resize handle of an Area far up and to the left
- **THEN** the Area stops shrinking at 520 × 520

#### Scenario: Hidden in far zoom
- **WHEN** the view is zoomed out to the far look
- **THEN** no resize handle is shown

### Requirement: Areas never overlap
An Area SHALL NOT be released overlapping another Area. While a moved or resized Area overlaps another one, it SHALL show that it cannot be released there. When a move or a resize is released with the Area overlapping another one, the Area (and, for a move, its Cards) SHALL slide back to where it was, nothing SHALL be saved, and a toast SHALL say there is another Area there.

#### Scenario: Warned before releasing
- **WHEN** the user drags the Area Recordar over the Area Vida without releasing it
- **THEN** Recordar shows that it cannot be released there

#### Scenario: Dropped on another Area
- **WHEN** the user drags the Area Recordar and releases it overlapping the Area Vida
- **THEN** Recordar and its Cards slide back to where they were, and a toast says another Area is there

#### Scenario: Grown into another Area
- **WHEN** the user resizes the Area Trabajo until it overlaps the Area Vida and releases
- **THEN** Trabajo goes back to its previous size

### Requirement: Delete an Area
The Area editor SHALL offer "Borrar área" (Delete area), which SHALL ask for confirmation before anything changes. On confirming, the Area SHALL be removed from the Desk, the Dock, the Place selector and Settings, and a toast SHALL confirm it.

#### Scenario: Delete an empty Area
- **WHEN** the user deletes a custom Area with no Cards and confirms
- **THEN** the Area is gone from the Desk, the Dock, the Place selector and Settings

#### Scenario: Change of mind
- **WHEN** the user asks to delete an Area and then closes the editor without confirming
- **THEN** the Area and its Cards are unchanged

### Requirement: The user chooses where a deleted Area's Cards go
When the Area being deleted holds Cards (on the Desk or in the Jar), the confirmation SHALL show how many and let the user choose the Area they go to, with the nearest other Area chosen by default. The Desk Cards SHALL move inside the chosen Area, as the Place selector does, and the Cards in the Jar SHALL join it. No Card and no Win SHALL be lost, and the toast SHALL say how many Cards went where.

#### Scenario: Choose where the Cards go
- **WHEN** the Area Vida holds 3 Cards on the Desk and 1 in the Jar, and the user deletes it choosing Trabajo
- **THEN** the 3 Cards sit inside Trabajo in Trabajo's color, the Jar piece is in Trabajo's color, and every Win and the things-done count stay the same

#### Scenario: Nearest Area by default
- **WHEN** the user asks to delete the Area Recordar while it holds Cards
- **THEN** the destination offered first is Vida, the Area nearest to Recordar

### Requirement: The last Area stays
MTF SHALL NOT let the user delete the last remaining Area: the delete action SHALL be disabled with a short explanation.

#### Scenario: Only one Area left
- **WHEN** the Desk holds a single Area and the user opens its editor
- **THEN** "Borrar área" is disabled and the editor says the Desk needs at least one Area

### Requirement: Area edits are saved
Creating, renaming, recoloring, moving, resizing and deleting an Area SHALL be saved as soon as it happens (a move or resize when it is released) and restored exactly after a reload, together with the Cards it changed.

#### Scenario: Reload after editing
- **WHEN** the user creates the Area "Facu", moves it, resizes it, renames Vida to "Casa", colors it plum, and reloads MTF
- **THEN** "Facu" is where and as big as it was left, with its Cards, and "Casa" is plum

#### Scenario: Reload after deleting
- **WHEN** the user deletes the Area Vida, moving its Cards to Trabajo, and reloads MTF
- **THEN** Vida is gone and its Cards are in Trabajo

### Requirement: Area controls stay quiet
The Area editor, the edit button on a label, the resize handle and the Areas section SHALL NOT use the accent color; a moved Area SHALL NOT tilt. With reduced motion on, a moved or resized Area that slides back and the flight to a new Area SHALL happen without animation.

#### Scenario: Reduced motion
- **WHEN** reduced motion is on and the user releases an Area overlapping another one
- **THEN** the Area is back in its place at once and the toast still appears

### Requirement: Arrange the Areas
The Areas section of Settings SHALL offer "Acomodar áreas" (Arrange areas) with four choices: Fila (Row), Tabla (Grid), Estrella (Star) and Mi disposición (My arrangement). Choosing one SHALL close Settings, move every Area to its place in that arrangement and show the whole Desk. Arranging SHALL be a one-time action: afterwards the user SHALL still move and resize Areas by hand, and a new Area SHALL still take the first free slot.

#### Scenario: Arrange in a grid
- **WHEN** the Desk holds four Areas and the user chooses Tabla in Settings
- **THEN** Settings closes, the Areas stand in two rows of two, and the view shows the whole Desk

#### Scenario: Still free afterwards
- **WHEN** the user has arranged the Areas as Estrella and then drags the label of one of them to empty paper
- **THEN** that Area moves and the others stay where the arrangement left them

#### Scenario: Works without a gesture
- **WHEN** a keyboard user opens Settings and activates Fila
- **THEN** the Areas are arranged in a row

### Requirement: Row arrangement
Fila SHALL place every Area side by side, left to right in the order Settings lists them, with their tops aligned, starting where the default Areas start and with the spacing of the default Areas. The three default Areas in their original places SHALL already be in this arrangement.

#### Scenario: A second row becomes one row
- **WHEN** the Desk holds the three default Areas and a fourth Area below Trabajo, and the user chooses Fila
- **THEN** the four Areas stand in one row, in the order Settings lists them

#### Scenario: Default Desk unchanged
- **WHEN** the Desk holds only the three default Areas in their original places and the user chooses Fila
- **THEN** no Area moves

### Requirement: Grid arrangement
Tabla SHALL place the Areas in rows, in the order Settings lists them, with as many columns as the smallest square grid that holds them all (2 columns for 2 to 4 Areas, 3 for 5 to 9, and so on). Each column SHALL be as wide as its widest Area and each row as tall as its tallest Area, with the spacing of the default Areas.

#### Scenario: Five Areas
- **WHEN** the Desk holds five Areas and the user chooses Tabla
- **THEN** three Areas stand in the first row and two in the second

#### Scenario: Three Areas
- **WHEN** the Desk holds the three default Areas and the user chooses Tabla
- **THEN** Trabajo and Vida stand in the first row and Recordar starts the second

### Requirement: Star arrangement
Estrella SHALL place the Areas in a ring around an empty center, the first Area in Settings at the top and the rest clockwise, evenly spread, with the center left free of Areas for the Jar. With two Areas, they SHALL stand left and right of the center. With a single Area, Estrella SHALL be the same as Fila.

#### Scenario: Star with the Jar in the middle
- **WHEN** the Desk holds five Areas and the user chooses Estrella
- **THEN** the five Areas form a ring with the first one at the top, and the Jar is in the middle of the ring

#### Scenario: Two Areas
- **WHEN** the Desk holds two Areas and the user chooses Estrella
- **THEN** one Area stands left of the Jar and the other right of it

### Requirement: Arranging keeps sizes and never overlaps
Every arrangement SHALL keep each Area's size and SHALL leave no Area overlapping another one, whatever their sizes.

#### Scenario: Areas of different sizes
- **WHEN** the user has made Vida twice as wide and twice as tall as the other Areas and chooses Fila, Tabla or Estrella
- **THEN** Vida keeps its size and no two Areas overlap

### Requirement: Cards travel with their Area when arranging
When an arrangement moves an Area, every Card of that Area on the Desk SHALL move by the same distance and keep its Area, tilt and stacking order, as in a hand move. Cards in the Jar SHALL NOT change. With reduced motion off, Areas and Cards SHALL slide to their new places; with it on, they SHALL be there at once.

#### Scenario: Cards come along
- **WHEN** the Area Recordar holds 3 Cards and Fila moves Recordar 1000 px to the left
- **THEN** its 3 Cards are 1000 px further left, still in Recordar

#### Scenario: Reduced motion
- **WHEN** reduced motion is on and the user chooses Tabla
- **THEN** the Areas and their Cards are in their new places at once

### Requirement: Save my arrangement
The Areas section SHALL offer "Guardar esta disposición" (Save this arrangement), which SHALL remember the place and size of every Area as the user's arrangement and confirm it with a toast. There SHALL be a single saved arrangement: saving again SHALL replace it.

#### Scenario: Save
- **WHEN** the user moves the Areas by hand and activates "Guardar esta disposición"
- **THEN** a toast confirms the arrangement was saved and "Mi disposición" becomes available

#### Scenario: Saving again replaces it
- **WHEN** the user saves an arrangement, moves an Area, saves again and later chooses "Mi disposición"
- **THEN** the Areas go back to the second saved arrangement

### Requirement: Return to my arrangement
Mi disposición SHALL put every Area that was saved back in its saved place and size, with its Cards on the Desk, as an arrangement does. An Area created after the save SHALL go to the first free slot; an Area deleted after the save SHALL be ignored. Mi disposición SHALL be unavailable while no saved arrangement includes any current Area.

#### Scenario: Back to my arrangement
- **WHEN** the user saved an arrangement, chose Estrella and then chooses "Mi disposición"
- **THEN** every Area and its Cards are back where they were when the arrangement was saved

#### Scenario: An Area created after saving
- **WHEN** the user saved an arrangement, created the Area "Facu" and chooses "Mi disposición"
- **THEN** the saved Areas go back to their places and "Facu" takes the first free slot, overlapping no Area

#### Scenario: Nothing saved yet
- **WHEN** the user opens Settings and has never saved an arrangement
- **THEN** "Mi disposición" is shown as unavailable

### Requirement: Confirm before an arrangement is lost
When the Areas are neither in the saved arrangement nor in the place Fila, Tabla or Estrella would put them, choosing an arrangement SHALL first ask, in place, whether to arrange anyway ("Tu disposición actual no está guardada. ¿Acomodar igual?") with "Acomodar" and "Cancelar". Cancelar SHALL change nothing. Otherwise the arrangement SHALL happen at once.

#### Scenario: Hand-made arrangement not saved
- **WHEN** the user has moved an Area by hand without saving and chooses Estrella
- **THEN** MTF asks whether to arrange anyway, and the Areas do not move until the user chooses "Acomodar"

#### Scenario: Cancel
- **WHEN** MTF asks whether to arrange anyway and the user chooses "Cancelar"
- **THEN** no Area and no Card moves

#### Scenario: Nothing to lose
- **WHEN** the Areas are as Fila left them and the user chooses Tabla
- **THEN** the Areas are arranged without asking

### Requirement: My arrangement belongs to the device
The saved arrangement SHALL be kept on the device across reloads, like the language and the theme. It SHALL NOT be part of a Backup, and Import SHALL NOT change it. The arranged places of the Areas and their Cards SHALL be saved like any other Area move.

#### Scenario: Reload
- **WHEN** the user saves an arrangement, reloads MTF and chooses "Mi disposición" after choosing Fila
- **THEN** the Areas go back to the saved arrangement

#### Scenario: Not in the Backup
- **WHEN** the user exports a Backup on a PC with a saved arrangement and imports it on a phone that never saved one
- **THEN** the Areas sit where they were on the PC, and "Mi disposición" is unavailable on the phone
