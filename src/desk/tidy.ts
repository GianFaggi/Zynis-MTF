import type { Area, Card } from '../types'
import { CARD_WIDTH, FALLBACK_CARD_HEIGHT, between, randomTilt, type Random } from './geometry'

// Tidy up (KB/frontend/desk.md): the Cards of each Area in loose columns inside it.
// Only positions change; a Card never changes Area here.

export type TidyPosition = Pick<Card['position'], 'x' | 'y' | 'tilt'>

const COLUMN_GAP = 52
const ROW_GAP = 40
/** Room left at the top of the Area for its label. */
const TOP_OFFSET = 140

/** Pinned first, then newest first. */
function tidyOrder(a: Card, b: Card): number {
  return Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt
}

export function columnCount(areaWidth: number): number {
  return Math.max(1, Math.floor((areaWidth + COLUMN_GAP) / (CARD_WIDTH + COLUMN_GAP)))
}

/**
 * New positions for every Card on the Desk, keyed by Card id. Each Area's Cards go
 * into the shortest of its columns (a masonry), with a little jitter and a new tilt
 * so it still looks like paper. `heights` are the rendered Card heights.
 */
export function tidyLayout(
  areas: readonly Area[],
  cards: readonly Card[],
  heights: ReadonlyMap<string, number>,
  random: Random,
): Map<string, TidyPosition> {
  const positions = new Map<string, TidyPosition>()

  for (const area of areas) {
    const { x, y, w } = area.rect
    const inArea = cards.filter((card) => card.areaId === area.id && card.jarredAt === null).sort(tidyOrder)
    const cols = columnCount(w)
    const left = x + (w - (cols * CARD_WIDTH + (cols - 1) * COLUMN_GAP)) / 2
    const columnBottoms = Array<number>(cols).fill(y + TOP_OFFSET)

    for (const card of inArea) {
      const column = columnBottoms.indexOf(Math.min(...columnBottoms))
      positions.set(card.id, {
        x: Math.round(left + column * (CARD_WIDTH + COLUMN_GAP) + between(random, -14, 14)),
        y: Math.round(columnBottoms[column] + between(random, -8, 10)),
        tilt: randomTilt(random),
      })
      columnBottoms[column] += (heights.get(card.id) ?? FALLBACK_CARD_HEIGHT) + ROW_GAP
    }
  }

  return positions
}
