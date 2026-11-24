# sync Specification

## Purpose
Lets the same Desk (Areas, Cards with their Items, and Wins) travel between the devices of one Account, per session: fetched on arrival and sent on leaving, in the background, never blocking the Desk and never polling.

## Requirements

### Requirement: What travels
Sync SHALL carry every Area, every Card (on the Desk and in the Jar, with its Items and its handwriting, each stroke with its color and width) and every Win of the signed-in Account. It SHALL NOT carry device settings: the language, the theme, Mi disposición, Frasco por área, Escritura a mano, the pens, the Welcome Card flag, the install nudge and the session stay on each device.

#### Scenario: A Card reaches the other device
- **WHEN** the user writes a Card on the phone, leaves MTF, and then opens MTF on the PC with the same Account
- **THEN** the Card is on the PC's Desk, in the same Area and position, with its Items

#### Scenario: Handwriting reaches the other device
- **WHEN** the user writes by hand in a Card on the iPad, leaves MTF, and then opens MTF on the PC with the same Account
- **THEN** the Card on the PC shows the same handwriting

#### Scenario: Colored handwriting reaches the other device
- **WHEN** the user writes in a Card with a red pen and a thick Tinta on the iPad, leaves MTF, and then opens MTF on the PC
- **THEN** the Card on the PC shows the same strokes in the same color and width

#### Scenario: Wins reach the other device
- **WHEN** the user checks an Item on the phone and later opens MTF on the PC
- **THEN** Mis logros on the PC counts that Win on the day it happened

#### Scenario: Settings stay on each device
- **WHEN** the user switches the PC to the dark theme and English and then opens MTF on the phone
- **THEN** the phone keeps its own theme and language

#### Scenario: The handwriting setting stays on each device
- **WHEN** the user turns "Escritura a mano" on on the iPad and then opens MTF on the phone
- **THEN** the phone keeps "Escritura a mano" as it was

#### Scenario: The pens stay on each device
- **WHEN** the user changes Lápiz 2 to green on the iPad and then opens MTF on the phone
- **THEN** the phone's Lápiz 2 is as it was

### Requirement: Only with a session
Sync SHALL run only while the device has a session. With no session MTF SHALL make no sync request, and signing out SHALL stop sync and leave every Card, Area and Win on the device.

#### Scenario: No account
- **WHEN** a user with no session uses MTF, leaves and returns
- **THEN** no sync request is made

#### Scenario: Signed out
- **WHEN** the user signs out and keeps writing Cards
- **THEN** nothing is sent, and the Cards stay on this device

### Requirement: Sync never blocks the Desk
The Desk, the Jar, Mis logros, Settings and the Backup SHALL work while a sync runs, while the server sleeps and with no connection. No sync SHALL show a dialog except the first sign-in choice, and no failure SHALL be shown as an error.

#### Scenario: Server asleep at launch
- **WHEN** a signed-in user opens MTF while the server is waking up
- **THEN** the Desk appears and responds at once, and the sync finishes in the background

#### Scenario: Offline
- **WHEN** a signed-in user works with no connection
- **THEN** everything works, and the changes wait on the device to be sent

### Requirement: Arriving fetches the Desk
When a signed-in device arrives (MTF launches, becomes visible again, or receives input after counting as gone for being idle), MTF SHALL fetch what changed in the Account since its last sync, merge it, and then send what is pending on this device.

#### Scenario: Launch
- **WHEN** a signed-in user launches MTF with a connection
- **THEN** MTF fetches the Account's changes, merges them and sends its own pending changes

#### Scenario: Back to the app
- **WHEN** the user switches back to MTF from another app or tab
- **THEN** MTF fetches and merges the Account's changes made meanwhile on another device

### Requirement: Leaving sends the Desk
When a signed-in device leaves (MTF is hidden or the page is being closed), MTF SHALL send what is pending, in a way the browser keeps sending after the page is gone when the batch is small enough (about 64 KB), and with an ordinary request otherwise.

#### Scenario: Switching apps on the phone
- **WHEN** the user edits a Card on the phone and switches to another app
- **THEN** the change is sent to the server

#### Scenario: Closing the tab
- **WHEN** the user edits a Card on the PC and closes the tab
- **THEN** the change is sent to the server even though the page is gone

### Requirement: Idle counts as leaving
When MTF stays visible with no pointer, touch or keyboard input for 2.5 minutes, it SHALL count as leaving and send what is pending. The next input SHALL count as arriving.

#### Scenario: PC left open
- **WHEN** the user edits a Card on the PC and walks away with MTF still open
- **THEN** after 2.5 minutes with no input the change is sent

#### Scenario: Coming back to the PC
- **WHEN** the user returns to that PC and moves the mouse
- **THEN** MTF fetches the changes made meanwhile on the phone

### Requirement: Back online sends what is pending
When the connection comes back on a signed-in device with pending changes, MTF SHALL send them.

#### Scenario: Signal returns
- **WHEN** the user edits Cards with no signal and the signal returns while MTF is open
- **THEN** the pending changes are sent

### Requirement: Sync now
Settings → Cuenta SHALL offer "Sincronizar ahora" / "Sync now" while signed in. It SHALL fetch and send at once, as an arrival does.

#### Scenario: Sync now
- **WHEN** the user activates Sincronizar ahora
- **THEN** MTF fetches the Account's changes, merges them and sends its pending changes

### Requirement: No polling
MTF SHALL NOT fetch from the server on a timer. The only request MTF repeats on its own while the user works SHALL be a wake-up of the server, at most once every 10 minutes, and only while there are pending changes and MTF is visible; it SHALL NOT read or write any data.

#### Scenario: Reading only
- **WHEN** a signed-in user keeps MTF open for an hour and changes nothing
- **THEN** no request is made after the arrival's sync

#### Scenario: Writing for a long time
- **WHEN** a signed-in user keeps editing for 40 minutes without leaving
- **THEN** MTF wakes the server at most once every 10 minutes, so the leaving send finds it awake

### Requirement: Nothing is lost when a send fails
A change SHALL stay pending on the device until the server confirms it. An unconfirmed send SHALL be sent again on the next arrival. Retries after a failure SHALL wait longer each time and SHALL stop after a few attempts until the next trigger.

#### Scenario: Answer lost
- **WHEN** a send reaches the server but its answer is lost
- **THEN** the change is sent again on the next arrival, and the server keeps one copy

#### Scenario: Server down
- **WHEN** the server does not answer
- **THEN** MTF tries again a few times, each after a longer wait, and then stops until the next arrival, leave, return of the connection or Sincronizar ahora

### Requirement: Pending changes survive a reload
Pending changes, deletions and the last sync position SHALL be kept on the device, apart from the notes and outside the Backup, so closing MTF or losing the connection loses nothing.

#### Scenario: Closed with pending changes
- **WHEN** the user edits Cards offline and closes MTF
- **THEN** the next launch with a connection sends those changes

#### Scenario: Backup unchanged
- **WHEN** the user exports a Backup on a signed-in device
- **THEN** the file has the same format as before and carries no sync state

### Requirement: The server keeps records opaque
The server SHALL store each Area, Card and Win as an opaque record of its Account, with its kind, id, data, the time it changed and, if deleted, when. It SHALL NOT read or validate the fields inside a record's data, so the Desk's shape is decided only by the app.

#### Scenario: A new Card field
- **WHEN** a later version of the app adds a field to Cards
- **THEN** the server stores and returns it with no server change

### Requirement: One Account's records are private
Sync requests SHALL require a valid access token, and SHALL only read and write the records of that token's Account.

#### Scenario: No token
- **WHEN** a sync request arrives with no access token or an expired one
- **THEN** it is refused as unauthorized and nothing is read or written

#### Scenario: Another Account
- **WHEN** two Accounts have Cards with the same id
- **THEN** each Account only ever receives its own

### Requirement: Sending is idempotent and the newest change wins
The server SHALL accept a batch of records. For each, it SHALL keep the one that changed last: an older or equal change SHALL leave the stored record untouched, so sending the same batch twice changes nothing.

#### Scenario: Same batch twice
- **WHEN** the same batch is sent twice
- **THEN** the second send changes nothing on the server

#### Scenario: Older change
- **WHEN** a device sends a change to a Card that is older than the one the server has
- **THEN** the server keeps its newer copy

#### Scenario: Same Card edited offline on two devices
- **WHEN** the same Card is edited offline on the phone and later on the PC, and both send
- **THEN** every device ends up with the PC's version

### Requirement: Fetching by position
The server SHALL give each stored change an increasing position, and SHALL answer a fetch with the records whose position is after the one the device last saw, in order, in pages, including deletions.

#### Scenario: Only what is new
- **WHEN** a device fetches after a previous sync
- **THEN** it receives only the records changed since then

#### Scenario: Many changes
- **WHEN** more changes are waiting than fit in one answer
- **THEN** the device keeps fetching pages until it has them all, and merges once at the end

### Requirement: Deletions travel
Deleting an Area, a Card, an Item's Win or any Win SHALL reach the other devices of the Account, so a deleted thing never comes back from another device.

#### Scenario: Deleted Card
- **WHEN** the user deletes a Card on the phone and later opens the PC, which still had it
- **THEN** the Card disappears from the PC, with its Wins

#### Scenario: Unchecked Item
- **WHEN** the user unchecks an Item on the phone
- **THEN** its Win also disappears on the PC after the next sync

### Requirement: The server keeps deletions for 30 days
The server SHALL keep a deleted record, with its data, for 30 days after the deletion and SHALL remove it afterwards.

#### Scenario: Within 30 days
- **WHEN** a Card was deleted 10 days ago
- **THEN** the server still holds its record and data, marked as deleted

#### Scenario: After 30 days
- **WHEN** a Card was deleted 31 days ago
- **THEN** the server no longer holds it

### Requirement: A device away for too long starts over
When a device's last sync position is older than the deletions the server has already removed, or newer than any position the server ever gave, the server SHALL say so, and the device SHALL treat the next sync as a first sign-in instead of merging, so nothing deleted elsewhere comes back and a server that lost its data is refilled.

#### Scenario: Phone unused for two months
- **WHEN** a phone with notes opens MTF after more than 30 days without syncing
- **THEN** MTF applies the first sign-in rule instead of merging

#### Scenario: The server lost its data
- **WHEN** the server's records are lost and a signed-in device with notes syncs
- **THEN** MTF applies the first sign-in rule, finds the Account empty and sends this device's Desk

### Requirement: Records merge one by one
Merging SHALL decide each Area, Card and Win on its own: a fetched record replaces the local one unless this device has a newer pending change to it; a fetched deletion removes it unless this device changed it later.

#### Scenario: Different Cards on each device
- **WHEN** the phone edited one Card and the PC another, both offline
- **THEN** after both sync, every device has both edits

#### Scenario: Edited here after it was deleted there
- **WHEN** the PC deletes a Card and the phone edits it later, offline
- **THEN** after both sync, the Card exists with the phone's edit

### Requirement: Wins agree after a merge
After every merge MTF SHALL bring Wins in line with the Desk: exactly one Card Win per finished Card on the Desk and per Card in the Jar, none for an unfinished Card on the Desk, at most one Item Win per checked Item, none for an unchecked Item, and none for a Card or Item that is gone. Every device SHALL keep the same Win when it removes a duplicate.

#### Scenario: Finished on both devices
- **WHEN** the same Card was finished offline on the phone and on the PC, and both sync
- **THEN** the Card has one Card Win on every device, and Mis logros counts it once

#### Scenario: Unchecked on the other device
- **WHEN** the phone checks an Item and the PC, later and offline, unchecks it
- **THEN** after both sync, the Item is unchecked and has no Win on either device

#### Scenario: Never penalizes
- **WHEN** Wins are brought in line after a merge
- **THEN** only Wins of things unchecked, unfinished or deleted go away, never Wins because time passed

### Requirement: Remote changes wait for the open Card
A fetched change to the Card open in the editor SHALL wait until the editor closes, and then SHALL be merged by the same rules, so the text being typed never changes under the user.

#### Scenario: Editing while a change arrives
- **WHEN** the user is typing in a Card and a sync brings a change to that Card
- **THEN** the editor keeps what the user sees, and the change is merged when the editor closes

### Requirement: Remote changes wait for a drag
While a Card or an Area is lifted, fetched changes SHALL wait, and SHALL be merged right after the drop or the cancel.

#### Scenario: Dragging while a change arrives
- **WHEN** the user is dragging a Card and a sync brings changes
- **THEN** the dragged Card stays under the finger or pointer, and the changes are merged after the drop

### Requirement: First sign-in with an empty Account
When a device signs in to an Account that has no records, MTF SHALL send this device's whole Desk to it, without asking.

#### Scenario: First device of the Account
- **WHEN** the user creates an Account on the phone and signs in
- **THEN** the phone's Desk is sent to the Account

### Requirement: First sign-in on a new device
When a device whose Desk holds only the three default Areas, unchanged, and at most Welcome Cards signs in to an Account with records, MTF SHALL take the Account's Desk without asking.

#### Scenario: New PC
- **WHEN** the user installs MTF on a new PC and signs in to an Account that has notes
- **THEN** the PC shows the Account's Desk, and no question is asked

### Requirement: First sign-in when both sides have data
When both the device and the Account have data, MTF SHALL show a dialog with what each side has (number of Cards, number of Areas, last update) and two choices with neither preselected: "Usar el de la cuenta" / "Use the account's" and "Subir este" / "Upload this one". Nothing SHALL change until the user chooses.

#### Scenario: The dialog
- **WHEN** a device with its own notes signs in to an Account that has notes
- **THEN** the dialog shows both sides' Cards, Areas and last update, and no choice is selected

#### Scenario: Use the Account's
- **WHEN** the user chooses Usar el de la cuenta
- **THEN** this device's Desk is replaced by the Account's, after the local copy is kept

#### Scenario: Upload this one
- **WHEN** the user chooses Subir este
- **THEN** the Account's Desk becomes this device's: its records are replaced and the ones not on this device are deleted

#### Scenario: Closed without choosing
- **WHEN** the user closes the dialog without choosing
- **THEN** nothing changes on either side, no sync runs, and the dialog comes back on the next arrival

### Requirement: The replaced Desk is kept for 30 days
Before the Account's Desk replaces this device's, MTF SHALL keep a copy of this device's Desk on the device. Settings SHALL offer "Recuperar el escritorio anterior" / "Recover the previous desk" for 30 days; recovering SHALL put that copy back and make it the Account's Desk.

#### Scenario: Recover
- **WHEN** the user chose Usar el de la cuenta by mistake and then activates Recuperar el escritorio anterior
- **THEN** the previous Desk is back on this device and is sent to the Account

#### Scenario: After 30 days
- **WHEN** 30 days have passed since the replacement
- **THEN** Settings no longer offers to recover, and the copy is removed

### Requirement: No room for the copy means Export first
If the copy of the device's Desk cannot be kept on the device, the dialog SHALL say so and SHALL let the user choose Usar el de la cuenta only after an Export of this device's Desk.

#### Scenario: Storage full
- **WHEN** the copy does not fit on the device and the user wants Usar el de la cuenta
- **THEN** the dialog asks for an Export first, and the choice becomes available once the file is made

### Requirement: Sync shows quietly
A sync SHALL show the paper plane's sync indicator in the tools pill only once it has lasted about 2 seconds. When a sync brought changes from another device, MTF SHALL show the toast "Tu escritorio está al día" / "Your desk is up to date"; a sync that brought nothing SHALL show nothing. No sync state SHALL use the accent color or red.

#### Scenario: Quick sync
- **WHEN** a sync ends within 2 seconds and brings nothing
- **THEN** nothing is shown

#### Scenario: Changes arrived
- **WHEN** a sync brings changes made on another device
- **THEN** the toast "Tu escritorio está al día" appears

### Requirement: Sync status in Account
Settings → Cuenta and the Account sheet SHALL show, while signed in, when the last sync finished and how many changes wait to be sent, in calm words, with no warning color and no guilt.

#### Scenario: Pending changes
- **WHEN** the user opens Settings with 3 changes not yet sent
- **THEN** the Account section shows the last sync time and that 3 changes will go up on the next sync

#### Scenario: All sent
- **WHEN** nothing is pending
- **THEN** the Account section shows only the last sync time

### Requirement: Sync in both languages
Every sync text (the dialog, the toast, the status, the recovery, the indicator's name) SHALL exist in Spanish and English and follow the current language.

#### Scenario: English
- **WHEN** the language is English and a sync brings changes
- **THEN** the toast reads "Your desk is up to date"
