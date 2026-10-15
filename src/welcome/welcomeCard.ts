import type { Area, Card } from '../types'

// The Welcome Card (#20) is a plain Card MTF writes for the user: no field marks it,
// so dragging, checking, the Jar and Wins treat it like any other (KB/frontend/desk.md).

/** What the Welcome Card says, already in the language it is placed in. */
export interface WelcomeContent {
  title: string
  body: string
  /** Drag me, check this Item, check everything and drop me in the Jar. */
  items: [string, string, string]
}

/**
 * The Welcome Card in `area`: straight (tilt 0), so the first thing a new user reads
 * sits level, at the top-left of where `spotIn` places Cards, below the Area label and
 * inside what `areaView` shows on a phone. Its Items start unchecked.
 */
export function welcomeCard(area: Area, content: WelcomeContent, { z, now, newId }: { z: number; now: number; newId: () => string }): Card {
  return {
    id: newId(),
    areaId: area.id,
    title: content.title,
    body: content.body,
    items: content.items.map((text) => ({ id: newId(), text, done: false, createdAt: now, updatedAt: now })),
    pinned: false,
    position: { x: area.rect.x + 70, y: area.rect.y + 150, tilt: 0, z },
    jarredAt: null,
    createdAt: now,
    updatedAt: now,
  }
}
