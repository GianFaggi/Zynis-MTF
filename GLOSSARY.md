# Zynis MTF

MTF (Más Tareas Fáciles) is a personal notepad shaped like a desk: the user writes Cards, places them freely, and drops the finished ones into a Jar that shows how much they got done.

## The desk

**Desk**:
The single, endless surface where every Card lives. The user pans and zooms it. There is one Desk per user.
_Avoid_: Board, canvas (in UI copy), workspace, page

**Area**:
A named, colored region of the Desk (by default Trabajo, Vida, Recordar). An Area groups Cards by where they sit; it is not a container, a tab or a list. A Card belongs to the Area it was dropped in and takes its color.
_Avoid_: Board, table, tab, list, category, folder

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
A Card whose Items are all checked (it has at least one). A Card without Items is never finished by checking; it can still go into the Jar.
_Avoid_: Completed, closed, done card

**Pinned Card**:
A Card the user marked to stay on top of others in its Area when tidying up.
_Avoid_: Favorite, starred

## Wins

**Jar**:
The place on the Desk where the user drops Cards they are done with. It fills up with one piece of paper per Card, in the Card's Area color. A Card with unchecked Items is refused and slides back.
_Avoid_: Archive, trash, done list

**Win**:
Something the user did that counts toward Mis logros: checking an Item or finishing a Card. Writing a new Card counts separately and more quietly as a note written.
_Avoid_: Point, score, achievement, streak

**Mis logros** (EN: **My wins**):
The view that shows the user's Wins: things done in the last 7 days, a bar per day, notes written, and the Cards in the Jar (which can be taken back out). It only counts; it never punishes quiet days.
_Avoid_: Stats, dashboard, streak, progress report

## Data

**Backup**:
A file with all of the user's Desk, Cards and Wins, made by Export and loaded by Import. In the MVP it is how data moves between phone and PC.
_Avoid_: Sync, save file
