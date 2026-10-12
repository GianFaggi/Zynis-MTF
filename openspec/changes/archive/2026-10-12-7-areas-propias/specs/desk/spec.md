# Spec Delta

## MODIFIED Requirements

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
