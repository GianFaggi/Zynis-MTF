# Spec Delta

## MODIFIED Requirements

### Requirement: What a valid Backup is
Import SHALL accept a file only when it is an MTF Backup whose schema version MTF understands and whose Areas, Cards, Items and win events all have a valid shape: unique ids, the expected fields with the expected types, Area colors from the known set, every Card in an Area of the file, well-formed handwriting (stroke styles included) on every Card that has one, and at least one Area. A Card without handwriting SHALL be valid. An older version SHALL be migrated to the current one.

#### Scenario: Valid Backup accepted
- **WHEN** the user picks a Backup exported by this version of MTF
- **THEN** MTF offers to import it

#### Scenario: Backup with handwriting
- **WHEN** the user exports a Desk with a handwritten Card and imports the file on another device
- **THEN** the Card arrives with its handwriting exactly as written

#### Scenario: Backup with colored handwriting
- **WHEN** the user exports a Desk with a Card written with several pens and imports the file on another device
- **THEN** every stroke arrives with the color and width it was drawn with

#### Scenario: Backup from before handwriting
- **WHEN** the user picks a Backup exported by a version of MTF without handwriting
- **THEN** MTF offers to import it, and its Cards arrive without handwriting

#### Scenario: Backup from before pens
- **WHEN** the user picks a Backup with handwriting exported by a version of MTF without pens
- **THEN** MTF offers to import it, and its handwriting looks as it did, in Tinta

#### Scenario: Damaged handwriting
- **WHEN** a Card in the file has handwriting with a missing or wrongly typed part, or a stroke style whose color or width is not valid
- **THEN** MTF refuses the file as damaged and the current data stays exactly as it was
