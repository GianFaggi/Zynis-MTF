import { displayTitle, isFinished, pendingItems } from '../desk/cardText'
import type { Card, WinEvent } from '../types'

// How `MtfData.events` changes (ADR 0005, KB/frontend/architecture.md). Every rule
// returns a new list, or the same list when nothing changes, and never mutates its
// input. Two invariants hold after each store action:
// - a Card on the Desk has a Card Win exactly while it is finished (in the Jar, always);
// - a Win exists only while the Card or Item it counts exists.

export type NewId = () => string

export type JarVerdict = { ok: true } | { ok: false; pending: number }

/** The Jar takes finished Cards and Cards without Items; anything with unchecked Items waits. */
export function jarVerdict(card: Card): JarVerdict {
  const pending = pendingItems(card).length
  return pending === 0 ? { ok: true } : { ok: false, pending }
}

export function hasCardWin(events: readonly WinEvent[], cardId: string): boolean {
  return events.some((event) => event.type === 'card' && event.cardId === cardId)
}

function win(type: WinEvent['type'], card: Card, now: number, newId: NewId, itemId?: string): WinEvent {
  return {
    id: newId(),
    type,
    at: now,
    cardId: card.id,
    ...(itemId && { itemId }),
    title: displayTitle(card),
    areaId: card.areaId,
  }
}

/** Adds the Card Win to a finished Desk Card that has none, removes it from one that is not finished. */
export function syncCardWin(events: WinEvent[], card: Card, now: number, newId: NewId): WinEvent[] {
  if (card.jarredAt !== null) return events
  const finished = isFinished(card)
  const has = hasCardWin(events, card.id)
  if (finished && !has) return [...events, win('card', card, now, newId)]
  if (!finished && has) return events.filter((event) => !(event.type === 'card' && event.cardId === card.id))
  return events
}

/**
 * After an Item of `card` (already flipped) was checked or unchecked: checking adds an
 * Item Win, unchecking removes the most recent one for that Item; then the Card Win follows.
 */
export function itemToggled(events: WinEvent[], card: Card, itemId: string, now: number, newId: NewId): WinEvent[] {
  const item = card.items.find((candidate) => candidate.id === itemId)
  if (!item) return events
  let next: WinEvent[]
  if (item.done) {
    next = [...events, win('item', card, now, newId, itemId)]
  } else {
    const last = events.findLastIndex((event) => event.type === 'item' && event.itemId === itemId)
    next = last === -1 ? events : events.toSpliced(last, 1)
  }
  return syncCardWin(next, card, now, newId)
}

/** Removed Items take their Wins with them. */
export function itemsRemoved(events: WinEvent[], itemIds: readonly string[]): WinEvent[] {
  if (itemIds.length === 0) return events
  const removed = new Set(itemIds)
  const next = events.filter((event) => !(event.type === 'item' && event.itemId !== undefined && removed.has(event.itemId)))
  return next.length === events.length ? events : next
}

/** A deleted Card takes every event it has: Item Wins, its Card Win and its note. */
export function cardDeleted(events: WinEvent[], cardId: string): WinEvent[] {
  const next = events.filter((event) => event.cardId !== cardId)
  return next.length === events.length ? events : next
}

/** The Jar accepted the Card: a Card without Items gets its Card Win now; a finished one already has it. */
export function cardJarred(events: WinEvent[], card: Card, now: number, newId: NewId): WinEvent[] {
  return hasCardWin(events, card.id) ? events : [...events, win('card', card, now, newId)]
}

/** A new Card was kept when its editor closed. */
export function noteWritten(events: WinEvent[], card: Card, now: number, newId: NewId): WinEvent[] {
  return [...events, win('note', card, now, newId)]
}
