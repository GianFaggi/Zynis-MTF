# Spec Delta

## MODIFIED Requirements

### Requirement: Far zoom shows titles only
When zoomed out below 55%, every Card SHALL collapse to a large title, so the Desk reads like a map. A Card without a title SHALL show its first line of text, or its Items joined when it has no text. A Card with none of them but with handwriting SHALL show its handwriting, scaled to the Card.

#### Scenario: Zoom out to see titles
- **WHEN** the user zooms out below 55%
- **THEN** each Card shows only its title in large type, without its text or checklist

#### Scenario: Card without a title
- **WHEN** the user zooms out below 55% and a Card has no title but has text
- **THEN** that Card shows the first line of its text

#### Scenario: Card with only handwriting
- **WHEN** the user zooms out below 55% and a Card has only handwriting
- **THEN** that Card shows its handwriting filling the Card, not an empty title

#### Scenario: Handwriting under a title
- **WHEN** the user zooms out below 55% and a Card has a title and handwriting
- **THEN** that Card shows only its title, like any other Card

#### Scenario: Zoom back in
- **WHEN** the user zooms back in to 55% or more
- **THEN** Cards show their full content again
