# Spec Delta

## ADDED Requirements

### Requirement: Mis logros by Area
While "Frasco por área" is on, Mis logros SHALL offer a filter with "Todas" (EN "All") and one choice per Area, each with its color and name. It SHALL open on "Todas" from the wins counter and the Desk's Jar. With an Area chosen, every number and list in the sheet SHALL count that Area only. While the option is off, Mis logros SHALL show no filter and count every Area.

#### Scenario: Filter shown with the option
- **WHEN** the option is on and the user opens Mis logros from the wins counter
- **THEN** the filter shows "Todas" chosen, followed by every Area

#### Scenario: No filter without the option
- **WHEN** the option is off and the user opens Mis logros
- **THEN** no Area filter is shown and every Win is counted

#### Scenario: One Area
- **WHEN** the last 7 days hold 3 things done in Trabajo and 2 in Vida, and the user chooses Vida in the filter
- **THEN** the main number is 2, the bars, the best day and the total since you started count Vida's Wins only, and the Jar list shows only Vida's Cards

#### Scenario: Back to all
- **WHEN** the user chooses "Todas" again
- **THEN** the main number is 5

#### Scenario: The counter stays global
- **WHEN** the user has chosen Vida in Mis logros
- **THEN** the wins counter in the floating tools still shows the things done in every Area

#### Scenario: A quiet Area
- **WHEN** the user chooses an Area with nothing done in the last 7 days
- **THEN** Mis logros reads "Los días tranquilos también cuentan." and shows no warning

### Requirement: A Win counts in its Card's current Area
In the Area filter, every Win and note written SHALL count for the Area its Card belongs to now, not the Area it was in when the Win happened. The Areas SHALL add up to "Todas" for every Win whose Card still exists.

#### Scenario: A Card that changed Area
- **WHEN** the user checked 2 Items of a Card in Trabajo and then moved the Card to Vida
- **THEN** those 2 Wins count in Vida and not in Trabajo

#### Scenario: A deleted Area
- **WHEN** the user deletes the Area Recordar, moving its Cards to Vida
- **THEN** the Wins of those Cards count in Vida

#### Scenario: Adding up
- **WHEN** the user compares each Area's main number in the filter
- **THEN** their sum equals the main number under "Todas"
