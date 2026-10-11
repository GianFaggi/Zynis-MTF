import type { Card, Item } from '../types'

/** Items with some text; a blank Item is an unfinished edit, not part of the Card. */
export function usableItems(card: Card): Item[] {
  return card.items.filter((item) => item.text.trim() !== '')
}

/** No title, no text and no Item with text: such a Card is discarded when its editor closes. */
export function isEmptyCard(card: Card): boolean {
  return card.title.trim() === '' && card.body.trim() === '' && usableItems(card).length === 0
}

/** At least one Item with text, and every one of them checked. A Card without Items is never finished. */
export function isFinished(card: Card): boolean {
  const items = usableItems(card)
  return items.length > 0 && items.every((item) => item.done)
}

/** Items with text still to check: what keeps a Card out of the Jar. */
export function pendingItems(card: Card): Item[] {
  return usableItems(card).filter((item) => !item.done)
}

/** What names a Card when it shows one line only (far zoom, labels): its title, else its first text line, else its Items. */
export function displayTitle(card: Card): string {
  const title = card.title.trim()
  if (title) return title
  const firstLine = card.body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '')
  if (firstLine) return firstLine
  return usableItems(card)
    .map((item) => item.text.trim())
    .join(', ')
}
