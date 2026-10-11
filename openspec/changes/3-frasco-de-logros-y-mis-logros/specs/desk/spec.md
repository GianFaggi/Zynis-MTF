# Spec Delta

## MODIFIED Requirements

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
