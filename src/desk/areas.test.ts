import { describe, expect, it } from 'vitest'
import { translate } from '../i18n'
import { makeArea, rowOfAreas } from '../test/fixtures'
import {
  AREA_COLORS,
  MIN_AREA_SIZE,
  areaForPoint,
  areaName,
  cleanName,
  defaultAreas,
  freeSlot,
  nearestArea,
  nextColor,
  overlaps,
  overlapsAny,
  resizedRect,
  spotIn,
} from './areas'
import { CARD_WIDTH } from './geometry'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('defaultAreas', () => {
  it('returns Trabajo, Vida and Recordar side by side, in sage, sand and sky', () => {
    const areas = defaultAreas(1000)
    expect(areas.map((area) => [area.key, area.color])).toEqual([
      ['work', 'sage'],
      ['life', 'sand'],
      ['remember', 'sky'],
    ])
    expect(areas.map((area) => area.rect)).toEqual(rowOfAreas().map((area) => area.rect))
  })

  it('gives each Area a uuid and the creation time', () => {
    const areas = defaultAreas(1000)
    for (const area of areas) {
      expect(area.id).toMatch(uuid)
      expect(area.createdAt).toBe(1000)
      expect(area.updatedAt).toBe(1000)
    }
    expect(new Set(areas.map((area) => area.id)).size).toBe(3)
  })
})

describe('areaForPoint', () => {
  const areas = rowOfAreas()

  it('returns the Area that contains the point', () => {
    expect(areaForPoint(areas, { x: 1500, y: 600 })?.id).toBe('a2')
  })

  it('returns the nearest Area for a point in the gap between two', () => {
    // Vida ends at x = 2120, Recordar starts at 2200.
    expect(areaForPoint(areas, { x: 2130, y: 600 })?.id).toBe('a2')
    expect(areaForPoint(areas, { x: 2190, y: 600 })?.id).toBe('a3')
  })

  it('returns the nearest Area for a point far outside every Area', () => {
    expect(areaForPoint(areas, { x: 5000, y: -3000 })?.id).toBe('a3')
    expect(areaForPoint(areas, { x: 1600, y: 4000 })?.id).toBe('a2')
  })

  it('gives a tie to the first Area in the list', () => {
    // Exactly in the middle of the gap between Trabajo (ends 1060) and Vida (starts 1140).
    expect(areaForPoint(areas, { x: 1100, y: 600 })?.id).toBe('a1')
  })

  it('works with any number of Areas and any layout', () => {
    const four = [...areas, makeArea({ id: 'a4', color: 'plum', rect: { x: 80, y: 1300, w: 980, h: 600 } })]
    expect(areaForPoint(four, { x: 500, y: 1500 })?.id).toBe('a4')
    expect(areaForPoint(four, { x: 500, y: 1200 })?.id).toBe('a1')
  })

  it('returns nothing when there are no Areas', () => {
    expect(areaForPoint([], { x: 0, y: 0 })).toBeUndefined()
  })
})

describe('areaName', () => {
  it('translates a default Area by its key', () => {
    const [work] = rowOfAreas()
    expect(areaName(work, (key) => translate('es', key))).toBe('Trabajo')
    expect(areaName(work, (key) => translate('en', key))).toBe('Work')
  })

  it('a custom name overrides the key', () => {
    const area = makeArea({ id: 'a1', key: 'work', name: 'Facu' })
    expect(areaName(area, (key) => translate('es', key))).toBe('Facu')
  })
})

describe('spotIn', () => {
  it('places the Card inside the Area, below its label', () => {
    const [, life] = rowOfAreas()
    for (const value of [0, 0.5, 0.999]) {
      const spot = spotIn(life, () => value)
      expect(spot.x).toBeGreaterThanOrEqual(life.rect.x + 70)
      expect(spot.x + CARD_WIDTH).toBeLessThanOrEqual(life.rect.x + life.rect.w - 70)
      expect(spot.y).toBeGreaterThanOrEqual(life.rect.y + 150)
      expect(spot.y).toBeLessThanOrEqual(life.rect.y + 420)
    }
  })
})

describe('nextColor', () => {
  it('picks the first color no Area uses', () => {
    expect(nextColor(rowOfAreas())).toBe('plum')
    expect(nextColor([makeArea({ id: 'a1', color: 'sand' })])).toBe('sage')
  })

  it('goes back to the first color once all 12 are used', () => {
    const all = AREA_COLORS.map((color, index) => makeArea({ id: `a${index}`, color }))
    expect(nextColor(all)).toBe('sage')
  })
})

describe('freeSlot', () => {
  it('starts a second row below Trabajo after the default row', () => {
    expect(freeSlot(rowOfAreas())).toEqual({ x: 80, y: 1280, w: 980, h: 1000 })
  })

  it('takes the first slot of the row on an empty Desk', () => {
    expect(freeSlot([])).toEqual({ x: 80, y: 120, w: 980, h: 1000 })
  })

  it('reuses the slot of a deleted Area', () => {
    const [work, , remember] = rowOfAreas()
    expect(freeSlot([work, remember])).toEqual({ x: 1140, y: 120, w: 980, h: 1000 })
  })

  it('skips a slot that a moved Area covers', () => {
    const moved = makeArea({ id: 'm1', rect: { x: 300, y: 1500, w: 600, h: 600 } })
    expect(freeSlot([...rowOfAreas(), moved])).toEqual({ x: 1140, y: 1280, w: 980, h: 1000 })
  })

  it('skips a slot that a moved Area comes within 40 px of, and takes it at exactly 40 px', () => {
    // The slot at (80, 1280) ends at y = 2280.
    const close = makeArea({ id: 'm1', rect: { x: 80, y: 2300, w: 980, h: 600 } })
    expect(freeSlot([...rowOfAreas(), close])).toEqual({ x: 1140, y: 1280, w: 980, h: 1000 })

    const clear = makeArea({ id: 'm1', rect: { x: 80, y: 2320, w: 980, h: 600 } })
    expect(freeSlot([...rowOfAreas(), clear])).toEqual({ x: 80, y: 1280, w: 980, h: 1000 })
  })
})

describe('overlaps', () => {
  const a = { x: 0, y: 0, w: 100, h: 100 }

  it('is true when two rects share some area', () => {
    expect(overlaps(a, { x: 99, y: 99, w: 10, h: 10 })).toBe(true)
    expect(overlaps(a, { x: 20, y: 20, w: 10, h: 10 })).toBe(true)
  })

  it('allows shared edges and gaps', () => {
    expect(overlaps(a, { x: 100, y: 0, w: 50, h: 50 })).toBe(false)
    expect(overlaps(a, { x: 0, y: 100, w: 50, h: 50 })).toBe(false)
    expect(overlaps(a, { x: 300, y: 300, w: 50, h: 50 })).toBe(false)
  })

  it('overlapsAny ignores the Area itself', () => {
    const areas = rowOfAreas()
    expect(overlapsAny(areas, 'a1', areas[0].rect)).toBe(false)
    expect(overlapsAny(areas, 'a1', { ...areas[0].rect, x: 600 })).toBe(true)
  })
})

describe('resizedRect', () => {
  const rect = { x: 80, y: 120, w: 980, h: 1000 }

  it('grows from the bottom-right corner, keeping the top-left, rounded', () => {
    expect(resizedRect(rect, 400.4, 299.6)).toEqual({ x: 80, y: 120, w: 1380, h: 1300 })
  })

  it('stops at the minimum size', () => {
    expect(resizedRect(rect, -2000, -2000)).toEqual({ x: 80, y: 120, w: MIN_AREA_SIZE, h: MIN_AREA_SIZE })
    expect(MIN_AREA_SIZE).toBe(520)
  })
})

describe('nearestArea', () => {
  it('picks Vida for Recordar', () => {
    const areas = rowOfAreas()
    expect(nearestArea(areas, areas[2])?.id).toBe('a2')
  })

  it('breaks a tie by list order', () => {
    const areas = rowOfAreas()
    // Vida is 80 px from both Trabajo and Recordar.
    expect(nearestArea(areas, areas[1])?.id).toBe('a1')
  })

  it('measures from edge to edge, so a big far Area can be nearer than a small close one', () => {
    const middle = makeArea({ id: 'm', rect: { x: 1000, y: 1000, w: 600, h: 600 } })
    const below = makeArea({ id: 'b', rect: { x: 0, y: 1700, w: 3000, h: 600 } })
    const corner = makeArea({ id: 'c', rect: { x: 1700, y: 0, w: 600, h: 600 } })
    expect(nearestArea([corner, below, middle], middle)?.id).toBe('b')
  })

  it('is nothing for the only Area', () => {
    const [work] = rowOfAreas()
    expect(nearestArea([work], work)).toBeUndefined()
  })
})

describe('cleanName', () => {
  const work = makeArea({ id: 'a1', key: 'work', name: 'Oficina' })
  const custom = makeArea({ id: 'a4', name: 'Facu' })

  it('trims what was typed', () => {
    expect(cleanName(custom, '  Casa  ')).toBe('Casa')
  })

  it('an empty name brings a default Area back to its translated name', () => {
    expect(cleanName(work, '   ')).toBeUndefined()
  })

  it('an empty name keeps the old name of a custom Area', () => {
    expect(cleanName(custom, '')).toBe('Facu')
  })

  it('cuts the name at 40 characters', () => {
    expect(cleanName(custom, 'x'.repeat(50))).toBe('x'.repeat(40))
  })
})
