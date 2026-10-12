# desk Specification

## Purpose

Defines the Desk: the one free surface where every Card lives. It covers how the user pans and zooms it on touch and PC, how its Areas appear, and how the user finds their way around it (Dock, See all, Tidy up, search, first view, first-run hint).

## Requirements

### Requirement: One free surface
MTF SHALL open to a single Desk that fills the screen, with the floating `mtf` wordmark and controls over it. Cards SHALL sit anywhere on the Desk; no tabs, columns or grid SHALL decide where they go.

#### Scenario: Opening MTF
- **WHEN** the user opens MTF
- **THEN** the Desk fills the screen with its Areas visible or reachable
- **AND** there is no tab bar and no header bar

### Requirement: Pan the Desk
The user SHALL be able to move the Desk with one finger on empty paper, by dragging empty paper with the mouse, and by scrolling with two fingers on a trackpad or with a mouse wheel.

#### Scenario: Pan with the mouse
- **WHEN** the user drags empty paper 200 px to the left with the mouse
- **THEN** everything on the Desk moves 200 px to the left on screen

#### Scenario: Pan with one finger
- **WHEN** the user drags one finger across empty paper on a phone
- **THEN** the Desk follows the finger

#### Scenario: Pan with two-finger scroll
- **WHEN** the user scrolls with two fingers on a trackpad, or with the mouse wheel and no modifier key
- **THEN** the Desk moves in the scroll direction and does not zoom

### Requirement: Zoom the Desk
The user SHALL be able to zoom with a two-finger pinch on touch, and with `Ctrl`/`Cmd` + wheel or a trackpad pinch on PC. Zoom SHALL keep the point under the fingers' midpoint or the cursor fixed on screen, and stay between 8% and 180%.

#### Scenario: Pinch to zoom in
- **WHEN** the user spreads two fingers apart on the Desk
- **THEN** the Desk zooms in around the point between the fingers

#### Scenario: Ctrl + wheel zooms around the cursor
- **WHEN** the user holds `Ctrl` and scrolls the wheel up with the cursor over a Card
- **THEN** the Desk zooms in and that Card stays under the cursor

#### Scenario: Zoom limits
- **WHEN** the user keeps zooming out past 8%, or in past 180%
- **THEN** the zoom stops at that limit

### Requirement: Far zoom shows titles only
When zoomed out below 55%, every Card SHALL collapse to a large title, so the Desk reads like a map. A Card without a title SHALL show its first line of text, or its Items joined when it has no text.

#### Scenario: Zoom out to see titles
- **WHEN** the user zooms out below 55%
- **THEN** each Card shows only its title in large type, without its text or checklist

#### Scenario: Card without a title
- **WHEN** the user zooms out below 55% and a Card has no title but has text
- **THEN** that Card shows the first line of its text

#### Scenario: Zoom back in
- **WHEN** the user zooms back in to 55% or more
- **THEN** Cards show their full content again

### Requirement: Default Areas
On a first launch with no Areas stored, MTF SHALL create three Areas named Trabajo, Vida and Recordar (Work, Life, Remember in English), side by side, in sage, sand and sky, and keep them across reloads. Their names SHALL follow the UI language until the user renames them; a renamed Area SHALL show its custom name in both languages.

#### Scenario: First launch
- **WHEN** MTF opens with no stored Areas
- **THEN** the Desk shows the Areas Trabajo, Vida and Recordar side by side in their three colors

#### Scenario: Areas are created once
- **WHEN** the user reloads MTF after the first launch
- **THEN** the same three Areas are shown and no Area is added again

#### Scenario: Names follow the language
- **WHEN** the user switches the language to English
- **THEN** the Areas read Work, Life and Remember

#### Scenario: A renamed default Area keeps its name
- **WHEN** the user has renamed Vida to "Casa" and switches the language to English
- **THEN** that Area reads "Casa", and the other two read Work and Remember

#### Scenario: All Areas deleted but one
- **WHEN** the user has deleted every Area but one and reloads MTF
- **THEN** that one Area is shown and the default Areas are not created again

### Requirement: Areas are soft regions
Each Area SHALL be drawn as a soft tint of its color with no border, with its name and the number of Cards in it shown as a large label. An Area SHALL NOT clip, contain or arrange the Cards over it.

#### Scenario: Area label with count
- **WHEN** the Area Vida holds 4 Cards
- **THEN** its label reads "Vida" with the count 4

#### Scenario: Cards are not clipped
- **WHEN** a Card sits partly over the edge of an Area
- **THEN** the whole Card is visible

### Requirement: Any number of Areas
Every Desk behavior (Area regions, labels, Dock, Place selector, Tidy up, the Area a Card takes on drop, See all) SHALL work with whatever Areas are stored, whatever their number, names or colors.

#### Scenario: A fourth Area in the data
- **WHEN** the stored data holds four Areas
- **THEN** the Desk draws four regions, the Dock offers four Areas and the Place selector lists four

### Requirement: Fly to an Area
Tapping or clicking an Area's label, or its button in the Dock, SHALL move and zoom the view so that Area fills the screen at a readable size.

#### Scenario: Jump from the Dock
- **WHEN** the user activates "Recordar" in the Dock
- **THEN** the view moves to the Area Recordar

#### Scenario: Jump from the label
- **WHEN** the user taps the label of the Area Vida
- **THEN** the view moves to the Area Vida

### Requirement: See all
The Dock's "Ver todo" (See all) SHALL fit every Area, every Card on the Desk and the Jar into the screen. The zoom limit of 8% SHALL still apply: when the Desk is too large to fit at 8% (possible on a phone after a Card is dropped very far away), See all SHALL show the middle of the Desk at 8%.

#### Scenario: A Card far away
- **WHEN** a Card sits far outside every Area and the user activates See all
- **THEN** the view shows all Areas and that Card at once

#### Scenario: The Jar is included
- **WHEN** the user activates See all
- **THEN** the Jar is visible together with every Area

#### Scenario: A Desk too large for 8%
- **WHEN** the Desk is wider than the screen can show at 8% and the user activates See all
- **THEN** the view zooms to 8%, centered on the Desk, and search still finds any Card

### Requirement: Tidy up
The Dock's "Ordenar" (Tidy up) SHALL rearrange the Cards of each Area into loose columns inside that Area: pinned Cards first, then newest first. Tidy up SHALL NOT change any Card's Area, and the new positions SHALL be saved.

#### Scenario: Pinned first, then newest
- **WHEN** the Area Trabajo holds a pinned Card and two unpinned Cards, and the user activates Tidy up
- **THEN** the pinned Card comes first and the newer unpinned Card comes before the older one

#### Scenario: Areas do not change
- **WHEN** the user activates Tidy up
- **THEN** every Card keeps the Area it had, and no two Cards overlap

#### Scenario: Tidy up is kept
- **WHEN** the user tidies up and reloads MTF
- **THEN** the Cards are where Tidy up put them

### Requirement: Initial view
On opening, MTF SHALL show the whole Desk when it fits at 34% zoom or more; otherwise it SHALL show the first Area at a size readable on a phone.

#### Scenario: Desktop
- **WHEN** MTF opens in a wide desktop window
- **THEN** all Areas are visible at once

#### Scenario: Phone
- **WHEN** MTF opens on a phone-sized screen
- **THEN** the first Area is shown and its Cards' text is readable

### Requirement: Search
A search button SHALL open a search field. While the user types, Cards whose title, text or Items contain the text SHALL be outlined and the rest dimmed, ignoring case and accents. `Enter` SHALL fly to the first match. Closing the search SHALL restore every Card.

#### Scenario: Highlight matches
- **WHEN** the user searches "mate" and one Card's checklist contains "Preparar el mate"
- **THEN** that Card is outlined and the other Cards are dimmed

#### Scenario: Accents and case are ignored
- **WHEN** the user searches "cancion" and a Card's title is "Canción"
- **THEN** that Card is a match

#### Scenario: Go to the first match
- **WHEN** the user presses `Enter` in the search field with at least one match
- **THEN** the view moves to the first matching Card

#### Scenario: Close the search
- **WHEN** the user closes the search with its button or `Esc`
- **THEN** the field is cleared and no Card is dimmed or outlined

### Requirement: First-run hint
On a device's first launch, MTF SHALL show a short hint that Cards can be dragged anywhere, and held on a phone to move them. Once dismissed, it SHALL NOT appear again on that device.

#### Scenario: First launch
- **WHEN** MTF opens for the first time on a device
- **THEN** the hint is shown with a button to dismiss it

#### Scenario: Dismissed for good
- **WHEN** the user dismisses the hint and reloads MTF
- **THEN** the hint is not shown

### Requirement: Accent reserved for wins on the Desk
The Desk, its Areas, the Dock, search highlights and the first-run hint SHALL NOT use the accent color. On the Desk, only things the user did may use it: checked Items, a finished Card (its fill, border, halo, title, chip and seal), and the Jar.

#### Scenario: Search highlight
- **WHEN** a search outlines matching Cards
- **THEN** the outline uses ink, not the accent color

#### Scenario: Dock
- **WHEN** the Dock is shown, including its "Frasco" button
- **THEN** none of its buttons uses the accent color

### Requirement: Reduced motion
When the device asks for reduced motion, flying the view (to an Area, the Jar, See all, a search match) and Tidy up SHALL happen without animation, and the Win animations (sparks, a finished Card's pop and seal stamp, a Card shrinking into the Jar, a refused Card sliding back, a piece dropping into the Jar, the counter bump) SHALL NOT play. The result of each action SHALL be the same.

#### Scenario: Reduced motion
- **WHEN** reduced motion is on and the user activates an Area in the Dock
- **THEN** the view jumps straight to that Area

#### Scenario: Jar without motion
- **WHEN** reduced motion is on and the user drops a finished Card on the Jar
- **THEN** the Card is in the Jar right away, with no sparks, and the toast still appears
