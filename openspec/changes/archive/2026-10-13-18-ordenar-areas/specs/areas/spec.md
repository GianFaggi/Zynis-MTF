# Spec Delta

## ADDED Requirements

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
