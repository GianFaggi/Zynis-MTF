import type { Card } from '../types'

/** Lowercase without accents, so "cancion" finds "Canción". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Whether the Card's title, text or any Item contains the query. An empty query matches nothing. */
export function matchesQuery(card: Card, query: string): boolean {
  const needle = normalize(query.trim())
  if (!needle) return false
  return [card.title, card.body, ...card.items.map((item) => item.text)].some((text) => normalize(text).includes(needle))
}
