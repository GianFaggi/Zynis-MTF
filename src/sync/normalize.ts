import { isFinished } from '../desk/cardText'
import type { Card, Item, MtfData, WinEvent } from '../types'
import { cardJarred, syncCardWin, type NewId } from '../wins/rules'
import { compareIds } from './records'

// Bringing Wins back in line with the Desk after a merge (#37, design D10). Two devices can each break
// ADR 0005's invariants while offline: both finish the same Card, one unchecks what the other checked.
// Pure, and the same answer on every device, so devices that normalize on their own converge.

/** The duplicate every device keeps: the earliest, and on a tie the smallest id. */
function first(a: WinEvent, b: WinEvent): WinEvent {
  return a.at < b.at || (a.at === b.at && compareIds(a.id, b.id) <= 0) ? a : b
}

/**
 * - Every finished Desk Card, and every Card in the Jar, has exactly one `card` event; an unfinished
 *   Desk Card has none. A missing one is added at `now`.
 * - A checked Item keeps at most one `item` event; an unchecked Item has none. None is ever added.
 * - An event whose Card or Item is gone is removed.
 * Nothing goes for the passing of time. The same `data` when nothing changes.
 */
export function normalizeWins(data: MtfData, now: number, newId: NewId): MtfData {
  const cards = new Map(data.cards.map((card) => [card.id, card]))
  const items = new Map<string, { card: Card; item: Item }>()
  for (const card of data.cards) for (const item of card.items) items.set(item.id, { card, item })

  // Which event of each Card and each Item survives.
  const keepCard = new Map<string, WinEvent>()
  const keepItem = new Map<string, WinEvent>()
  for (const event of data.events) {
    if (event.type === 'card' && event.cardId !== undefined) {
      const card = cards.get(event.cardId)
      if (!card || !(card.jarredAt !== null || isFinished(card))) continue
      const kept = keepCard.get(card.id)
      keepCard.set(card.id, kept ? first(kept, event) : event)
    } else if (event.type === 'item' && event.itemId !== undefined) {
      const found = items.get(event.itemId)
      if (!found || !found.item.done || found.card.id !== (event.cardId ?? found.card.id)) continue
      const kept = keepItem.get(event.itemId)
      keepItem.set(event.itemId, kept ? first(kept, event) : event)
    }
  }

  let events = data.events.filter((event) => {
    if (event.type === 'card' && event.cardId !== undefined) return keepCard.get(event.cardId) === event
    if (event.type === 'item' && event.itemId !== undefined) return keepItem.get(event.itemId) === event
    // A note, or anything else counting a Card, goes with its Card.
    return event.cardId === undefined || cards.has(event.cardId)
  })

  // A finished or jarred Card left with no Card Win gets one, through the store's own rules.
  for (const card of data.cards) {
    if (keepCard.has(card.id)) continue
    events = card.jarredAt !== null ? cardJarred(events, card, now, newId) : syncCardWin(events, card, now, newId)
  }

  if (events.length === data.events.length && events.every((event, index) => event === data.events[index])) return data
  return { ...data, events }
}
