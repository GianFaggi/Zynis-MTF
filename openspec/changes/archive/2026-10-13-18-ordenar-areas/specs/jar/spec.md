# Spec Delta

## MODIFIED Requirements

### Requirement: The Jar on the Desk
The Jar SHALL sit on the Desk at the center of the Areas when that space, with its caption, is free of Areas, and centered below the Areas otherwise, with a caption showing the things done this week and that tapping it shows more. It SHALL pan and zoom with the Desk like everything on it, and stay where it is when Cards are moved or tidied up.

#### Scenario: Default Desk
- **WHEN** MTF opens with the three default Areas
- **THEN** the Jar is drawn below the Area Vida, with the caption "Tu frasco" and "N esta semana · tocalo para ver más"

#### Scenario: Zooming
- **WHEN** the user zooms the Desk out
- **THEN** the Jar shrinks with the Desk and stays in its place among the Areas

#### Scenario: Areas around an empty center
- **WHEN** the user arranges the Areas as Estrella
- **THEN** the Jar and its caption sit in the middle of the ring, overlapping no Area

#### Scenario: An Area takes the center
- **WHEN** the Areas are arranged as Fila or Tabla, so an Area or the space between two Areas too narrow for the Jar is at their center
- **THEN** the Jar sits centered below the Areas, as before
