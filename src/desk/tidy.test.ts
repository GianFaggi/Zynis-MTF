import { describe, expect, it } from 'vitest'
import { makeArea, makeCard, rowOfAreas, sequence } from '../test/fixtures'
import type { Card } from '../types'
import { CARD_WIDTH, FALLBACK_CARD_HEIGHT } from './geometry'
import { columnCount, tidyLayout } from './tidy'

const areas = rowOfAreas()
// Alternating extremes push the jitter to its limits, the worst case for overlaps.
const random = sequence(0, 0.999, 0.5, 0.999, 0)

function overlaps(a: { x: number; y: number; h: number }, b: { x: number; y: number; h: number }) {
  return a.x < b.x + CARD_WIDTH && b.x < a.x + CARD_WIDTH && a.y < b.y + b.h && b.y < a.y + a.h
}

function manyCards(areaId: string, count: number): Card[] {
  return Array.from({ length: count }, (_, i) => makeCard({ id: `${areaId}-c${i}`, areaId, createdAt: i }))
}

describe('columnCount', () => {
  it('fits 3 columns in a 980 px Area and 1 in a 500 px one', () => {
    expect(columnCount(980)).toBe(3)
    expect(columnCount(500)).toBe(1)
    expect(columnCount(100)).toBe(1)
  })
})

describe('tidyLayout', () => {
  it('puts pinned Cards first, then the newest first', () => {
    const cards = [
      makeCard({ id: 'old', createdAt: 1 }),
      makeCard({ id: 'new', createdAt: 3 }),
      makeCard({ id: 'pinned', createdAt: 2, pinned: true }),
      makeCard({ id: 'newest', createdAt: 4 }),
    ]
    const positions = tidyLayout(areas, cards, new Map(), () => 0.5)
    // With 3 columns and equal heights the order fills the first row left to right, then wraps.
    const order = [...positions.entries()].sort(([, a], [, b]) => a.y - b.y || a.x - b.x).map(([id]) => id)
    expect(order).toEqual(['pinned', 'newest', 'new', 'old'])
  })

  it('uses one column in a narrow Area', () => {
    const narrow = [makeArea({ id: 'n', rect: { x: 0, y: 0, w: 500, h: 2000 } })]
    const positions = tidyLayout(narrow, manyCards('n', 3), new Map(), () => 0.5)
    expect(new Set([...positions.values()].map((p) => p.x)).size).toBe(1)
  })

  it('uses three columns in a default Area, centered in it', () => {
    const positions = tidyLayout(areas, manyCards('a1', 3), new Map(), () => 0.5)
    const xs = [...positions.values()].map((p) => p.x).sort((a, b) => a - b)
    expect(xs).toHaveLength(3)
    const [work] = areas
    const left = xs[0] - work.rect.x
    const right = work.rect.x + work.rect.w - (xs[2] + CARD_WIDTH)
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1)
  })

  it('leaves no two Cards overlapping, with mixed heights and maximum jitter', () => {
    const cards = [...manyCards('a1', 9), ...manyCards('a2', 5), ...manyCards('a3', 1)]
    const heights = new Map(cards.map((card, i) => [card.id, 90 + ((i * 53) % 260)]))
    const positions = tidyLayout(areas, cards, heights, random)
    const placed = cards.map((card) => ({ ...positions.get(card.id)!, h: heights.get(card.id)! }))

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) expect(overlaps(placed[i], placed[j])).toBe(false)
    }
  })

  it('stacks a column using the measured heights, 160 px when one is missing', () => {
    const narrow = [makeArea({ id: 'n', rect: { x: 0, y: 0, w: 300, h: 2000 } })]
    const cards = [makeCard({ id: 'first', areaId: 'n', createdAt: 2 }), makeCard({ id: 'second', areaId: 'n', createdAt: 1 })]
    const positions = tidyLayout(narrow, cards, new Map(), () => 8 / 18) // y jitter of exactly 0
    expect(positions.get('second')!.y - positions.get('first')!.y).toBe(FALLBACK_CARD_HEIGHT + 40)
  })

  it('never changes a Card’s Area and ignores Cards in the Jar', () => {
    const cards = [makeCard({ id: 'c1', areaId: 'a2' }), makeCard({ id: 'jarred', areaId: 'a2', jarredAt: 9 })]
    const positions = tidyLayout(areas, cards, new Map(), random)

    expect(positions.has('jarred')).toBe(false)
    expect(Object.keys(positions.get('c1')!).sort()).toEqual(['tilt', 'x', 'y'])
    const [, life] = areas
    expect(positions.get('c1')!.x).toBeGreaterThan(life.rect.x)
    expect(positions.get('c1')!.x + CARD_WIDTH).toBeLessThan(life.rect.x + life.rect.w)
  })
})
