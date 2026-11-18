import { defaultAreas } from '../desk/areas'
import { en } from '../i18n/locales/en'
import { es } from '../i18n/locales/es'
import type { MtfData, SyncRecord } from '../types'
import { changedAt, entitiesOf, sameValue } from './records'

// The first sign-in rule (#37, design D12): what happens when this device's Desk and an Account's
// meet for the first time (or again, after an expired cursor). Pure.

export type FirstSignIn = 'upload' | 'take' | 'ask'

/** What the dialog shows for one side. */
export interface DeskSummary {
  /** Cards on the Desk. */
  desk: number
  /** Cards in the Jar. */
  jar: number
  areas: number
  /** The newest change on that side (epoch ms); `null` when there is nothing. */
  updatedAt: number | null
}

const WELCOME_TITLES = new Set([es.welcomeTitle, en.welcomeTitle])

/**
 * A device with nothing to protect: exactly the three default Areas, unchanged (no name, their own
 * color and place), at most Welcome Cards (in Spanish or English, checked or not) and only their Wins,
 * no note.
 */
export function isNewDevice(data: MtfData): boolean {
  const defaults = defaultAreas(0)
  if (data.areas.length !== defaults.length) return false
  const untouched = defaults.every((expected) => {
    const area = data.areas.find((candidate) => candidate.key === expected.key)
    return area !== undefined && area.name === undefined && area.color === expected.color && sameValue(area.rect, expected.rect)
  })
  if (!untouched) return false
  if (!data.cards.every((card) => WELCOME_TITLES.has(card.title))) return false
  const cardIds = new Set(data.cards.map((card) => card.id))
  return data.events.every((event) => event.type !== 'note' && event.cardId !== undefined && cardIds.has(event.cardId))
}

/** Upload to an Account with no live record; take the Account's Desk on a new device; otherwise ask. */
export function firstSignIn(local: MtfData, remote: readonly SyncRecord[]): FirstSignIn {
  if (!remote.some((record) => !record.deleted)) return 'upload'
  if (isNewDevice(local)) return 'take'
  return 'ask'
}

export function deskSummary(data: MtfData): DeskSummary {
  let updatedAt: number | null = null
  for (const entity of entitiesOf(data).values()) updatedAt = Math.max(updatedAt ?? 0, changedAt(entity))
  return {
    desk: data.cards.filter((card) => card.jarredAt === null).length,
    jar: data.cards.filter((card) => card.jarredAt !== null).length,
    areas: data.areas.length,
    updatedAt,
  }
}
