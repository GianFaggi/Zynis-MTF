# Areas are regions the user shapes: editable, movable and resizable, never overlapping, and their Cards travel with them

The Desk's Areas stop being three fixed regions. The user creates their own ("Facu", "Casa"), renames and recolors any Area (12 Paper colors, the default three included), deletes them (choosing the Area that receives their Cards; the last one stays), moves an Area by dragging its label and resizes it from a handle in its bottom-right corner.

Three rules come with that:

- **A moved Area takes its Cards with it.** Every Card of that Area on the Desk moves by the same distance, during the drag and in the same store write. Cards of other Areas never move, even when the moved Area ends up under them.
- **Areas never overlap.** A move or a resize released over another Area slides back, saves nothing and says why. A new Area takes the first free slot of the default row continued as a grid of 3 per row.
- **Resizing moves nothing.** It only changes the region; no Card moves or changes Area.

This refines [ADR 0001](0001-desk-instead-of-tabs.md) without contradicting it. MTF still never decides where a Card goes, and Areas are still not containers: no clipping, no layout, and a Card's Area is still decided when the Card is dropped. The user arranges the Desk by hand, as they would a real desk, and an Area moves as a group because that is what moving a pile of papers on a desk means. It is hard to reverse because users will lay out their Desk around these rules, and the stored `rect` of every Area becomes theirs.

## Considered Options

- **Editable but fixed Areas** (create, rename, recolor and delete only; positions from a grid): rejected at the user's request. The ticket allowed it as the smaller option, but a Desk you cannot rearrange is the "box" ADR 0001 escaped.
- **Move the Area alone, leaving its Cards in place**: rejected. The Cards would end up outside their own Area, in another Area's region, and moving an Area would mean moving each Card again.
- **Move every Card under the Area's region, whatever its Area**: rejected. Areas are not containers, and a Card would silently change Area by being under another one.
- **Allow overlapping Areas**: rejected. Dropping a Card onto overlapping regions would need a rule for which Area wins, and the Area colors would mix into a muddy tint.
- **A delete that keeps the Cards in place and lets `areaForPoint` reassign them**: rejected by the user in favor of choosing the destination explicitly in the confirmation.
- **A long-press menu on the label** for editing: rejected. Press and hold already means "move", as it does for a Card.

## Consequences

- No schema change: `Area` already had `name`, `key` and `rect`. Only `AreaColor` grows from 5 to 12, so an older MTF refuses a Backup with one of the new colors as damaged.
- An Area move writes the Area and its Cards in one `data` replacement; deleting an Area writes its Cards' new Area in the same replacement and leaves every Win untouched.
- The Desk's gesture controller learns two presses: a label press is `pending` like a Card (hold on touch, 4 px with a mouse), so a swipe across a label still pans and a tap still flies; the handle starts a resize at once. Covered by Playwright on both projects.
- Moving and resizing have no keyboard path. The Area editor (from Settings or the label's edit button) covers create, rename, recolor and delete, and every Card stays reachable through the Place selector, the Dock and search.
- A new Area may start a second row, so the Jar (derived from the Areas) moves below it and See all gets wider or taller.
