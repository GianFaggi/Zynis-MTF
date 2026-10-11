import { describe, expect, it } from 'vitest'
import { translate } from '../i18n'
import { makeArea, rowOfAreas } from '../test/fixtures'
import { areaForPoint, areaName, defaultAreas, spotIn } from './areas'
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
