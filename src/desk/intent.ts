// What a one-pointer gesture on the Desk means (KB/frontend/desk.md). A press on a
// Card or an Area label starts `pending`; a press on an Area's resize handle starts
// `resize`; a press on empty paper starts `pan`. Kept pure so every rule below is
// unit-tested; the Desk feeds it from @use-gesture/react.

export type Intent = 'pending' | 'pan' | 'drag' | 'resize'

export type PointerKind = 'mouse' | 'pen' | 'touch'

/** A touch must stay still this long to pick a Card or an Area up. */
export const HOLD_MS = 320
/** Mouse/pen: moving a Card or an Area label this far starts a drag. */
const MOUSE_DRAG_PX = 4
/** Touch: moving this far before the hold makes the gesture a pan. Also the tap limit. */
const TOUCH_PAN_PX = 9
/** A pan that moved less than this is a tap on whatever is under it (the Jar). */
const JAR_TAP_PX = 6

export interface IntentInput {
  intent: Intent
  pointerType: PointerKind
  /** Furthest distance from the press point so far, in screen px. */
  distance: number
  /** Whether the hold timer has fired. */
  held: boolean
}

export function nextIntent({ intent, pointerType, distance, held }: IntentInput): Intent {
  if (intent !== 'pending') return intent
  if (pointerType !== 'touch') return distance > MOUSE_DRAG_PX ? 'drag' : 'pending'
  if (held) return 'drag'
  return distance > TOUCH_PAN_PX ? 'pan' : 'pending'
}

/**
 * What releasing the pointer does: open the Card, fly to an Area, open Mis logros from
 * the Jar, drop what was dragged (a Card or an Area), end a resize, or nothing.
 */
export type ReleaseOutcome = 'open' | 'label' | 'jar' | 'drop' | 'resize' | 'none'

export function releaseOutcome({
  intent,
  distance,
  onLabel,
  onJar = false,
}: {
  intent: Intent
  distance: number
  onLabel: boolean
  onJar?: boolean
}): ReleaseOutcome {
  if (intent === 'drag') return 'drop'
  if (intent === 'resize') return 'resize'
  // A label press that never became a move or a pan is a tap on the label: it flies to the Area.
  if (intent === 'pending' && distance < TOUCH_PAN_PX) return onLabel ? 'label' : 'open'
  if (intent === 'pan' && distance < JAR_TAP_PX && onJar) return 'jar'
  return 'none'
}
