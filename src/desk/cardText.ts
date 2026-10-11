import type { Card, Item } from '../types'

/** Items with some text; a blank Item is an unfinished edit, not part of the Card. */
export function usableItems(card: Card): Item[] {
  return card.items.filter((item) => item.text.trim() !== '')
}

/** No title, no text and no Item with text: such a Card is discarded when its editor closes. */
export function isEmptyCard(card: Card): boolean {
  return card.title.trim() === '' && card.body.trim() === '' && usableItems(card).length === 0
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
