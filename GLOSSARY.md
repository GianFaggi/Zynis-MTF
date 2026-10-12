# Zynis MTF

MTF (Más Tareas Fáciles) is a personal notepad shaped like a desk: the user writes Cards, places them freely, and drops the finished ones into a Jar that shows how much they got done.

## The desk

**Desk**:
The single, endless surface where every Card lives. The user pans and zooms it. There is one Desk per user.
_Avoid_: Board, canvas (in UI copy), workspace, page

**Area**:
A named, colored region of the Desk. Three default Areas (Trabajo, Vida, Recordar) are created on first launch; the user will be able to add their own. An Area groups Cards by where they sit; it is not a container, a tab or a list. A Card belongs to the Area it was dropped in, or to the nearest Area when dropped outside all of them, and takes its color.
_Avoid_: Board, table, tab, list, category, folder

**Place**:
The editor's way to move a Card to another Area without dragging it (the "Lugar" selector). The Card lands somewhere inside the chosen Area and takes its color.
_Avoid_: Move to, category, folder

**Position**:
Where a Card sits on the Desk, in Desk coordinates (independent of zoom), plus a small tilt so it looks like paper.
_Avoid_: Coordinates (in UI copy), layout

**Tidy up**:
The action that rearranges the Cards of each Area into loose columns. It only moves Cards; it never changes their Area.
_Avoid_: Sort, auto-layout

## Cards

**Card**:
One note on the Desk: an optional title, optional free text and an optional checklist. There is no type to choose; a Card with Items is still just a Card.
_Avoid_: Note (as a type), task, post-it, ticket

**Item**:
One line of a Card's checklist, which can be checked or unchecked.
_Avoid_: Task, subtask, todo, checkbox

**Finished Card**:
A Card whose Items with text are all checked (it has at least one). A Card without Items is never finished, but it can still go into the Jar. Adding an unchecked Item makes a finished Card unfinished again, and it loses its Card Win until it is finished again. On the Desk, a finished Card shows the "Llevala al frasco" chip.
_Avoid_: Completed, closed, done card

**Pinned Card**:
A Card the user marked to stay on top of others in its Area when tidying up.
_Avoid_: Favorite, starred

## Wins

**Jar**:
The place on the Desk, centered below the Areas, where the user puts Cards they are done with, by dropping them on it or with "Llevar al frasco" in the editor. It fills up with one piece of paper per Card, in the Card's Area color. A Card with unchecked Items is refused and slides back. Cards in the Jar leave the Desk but are kept.
_Avoid_: Archive, trash, done list

**Win**:
Something the user did that counts toward Mis logros: checking an Item (an Item Win) or finishing a Card (a Card Win). A Card has one Card Win exactly while it is finished (in the Jar it always has one, so a Card without Items gets it there). A half-done Card counts only its checked Items. A Win goes away with what it counts: unchecking or removing an Item, unfinishing or deleting a Card. The passing of time never removes one ([ADR 0005](docs/adr/0005-win-events-with-removals.md)).
_Avoid_: Point, score, achievement, streak

**Things done** (ES: **cosas hechas**):
The number of Wins (Item Wins plus Card Wins) in a period. The wins counter and the main number in Mis logros show the things done in the last 7 days: today plus the six previous calendar days.
_Avoid_: Score, total points, productivity

**Note written** (ES: **nota escrita**):
A newly created Card that the user kept (it was not empty when its editor closed). It is counted on its own, more quietly, and is not a Win. Deleting the Card removes it.
_Avoid_: Post, entry

**Mis logros** (EN: **My wins**):
The view that shows the user's Wins: things done in the last 7 days, a bar per day, notes written, the total since you started, and the Cards in the Jar (which can be taken back out). It only counts; it never punishes quiet days.
_Avoid_: Stats, dashboard, streak, progress report

**Devolver** (EN: **Take out**):
Taking a Card out of the Jar from Mis logros. The Card goes back on the Desk inside its Area, on top of the others.
_Avoid_: Restore, undo, unarchive

## Data

**Backup** (ES: **copia de seguridad**, **copia**):
A file (`mtf-backup-YYYY-MM-DD.json`) with all of the user's Areas, Cards (on the Desk and in the Jar) and Wins, made by Export and loaded by Import. It does not carry device settings such as the language or the theme. In the MVP it is how data moves between phone and PC ([ADR 0006](docs/adr/0006-backup-file-format.md)).
_Avoid_: Sync, save file, archive

**Export** (ES: **Exportar copia**):
Making a Backup of everything on this device. On a phone it opens the share menu with the file; on a PC it downloads it.
_Avoid_: Save, sync, download (as the name of the action)

**Import** (ES: **Importar copia**):
Loading a Backup on this device. MTF checks the file first and, after the user confirms, **replaces** everything on the device with it; it never merges. A file that is not a valid Backup changes nothing.
_Avoid_: Restore, sync, merge, open
