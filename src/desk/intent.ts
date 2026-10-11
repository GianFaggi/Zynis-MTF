// What a one-pointer gesture on the Desk means (KB/frontend/desk.md). A press on a
// Card starts `pending`; a press on empty paper starts `pan`. Kept pure so every
// rule below is unit-tested; the Desk feeds it from @use-gesture/react.

export type Intent = 'pending' | 'pan' | 'drag'

export type PointerKind = 'mouse' | 'pen' | 'touch'

/** A touch must stay still this long to pick a Card up. */
export const HOLD_MS = 320
/** Mouse/pen: moving a Card this far starts a drag. */
const MOUSE_DRAG_PX = 4
/** Touch: moving this far before the hold makes the gesture a pan. Also the tap limit. */
const TOUCH_PAN_PX = 9
/** A pan that moved less than this is a tap on whatever is under it (an Area label). */
const LABEL_TAP_PX = 6

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

/** What releasing the pointer does: open the Card, fly to an Area, drop the Card, or nothing. */
export type ReleaseOutcome = 'open' | 'label' | 'drop' | 'none'

export function releaseOutcome({
  intent,
  distance,
  onLabel,
}: {
  intent: Intent
  distance: number
  onLabel: boolean
}): ReleaseOutcome {
  if (intent === 'drag') return 'drop'
  if (intent === 'pending' && distance < TOUCH_PAN_PX) return 'open'
  if (intent === 'pan' && distance < LABEL_TAP_PX && onLabel) return 'label'
  return 'none'
}
