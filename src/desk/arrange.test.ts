import { describe, expect, it } from 'vitest'
import { makeArea, rowOfAreas } from '../test/fixtures'
import type { Area } from '../types'
import { centeredJar, jarBounds, jarRect } from '../wins/jarLayout'
import {
  canRestore,
  gridArrangement,
  isRecoverable,
  rowArrangement,
  savedArrangement,
  starArrangement,
  type Arrangement,
} from './arrange'
import { AREA_GAP, grown, overlaps } from './areas'

/** Areas a1, a2, … of the given sizes, scattered so no arrangement starts out in place. */
function areasOf(sizes: { w: number; h: number }[]): Area[] {
  return sizes.map((size, index) => makeArea({ id: `a${index + 1}`, rect: { x: 5000 + index * 37, y: 9000 - index * 51, ...size } }))
}

const square = { w: 980, h: 1000 }

function same(count: number) {
  return areasOf(Array.from({ length: count }, () => square))
}

/** Every pair of targets, each pair once. */
function pairs(targets: Arrangement) {
  const rects = [...targets.values()]
  return rects.flatMap((a, i) => rects.slice(i + 1).map((b) => [a, b] as const))
}

function expectSizesKeptAndIntegers(areas: readonly Area[], targets: Arrangement) {
  expect([...targets.keys()]).toEqual(areas.map((area) => area.id))
  for (const area of areas) {
    const rect = targets.get(area.id)!
    expect([rect.w, rect.h]).toEqual([area.rect.w, area.rect.h])
    for (const value of Object.values(rect)) expect(Number.isInteger(value)).toBe(true)
  }
}

function expectNoOverlap(targets: Arrangement) {
  for (const [a, b] of pairs(targets)) expect(overlaps(a, b)).toBe(false)
}

describe('rowArrangement', () => {
  it('leaves the three default Areas exactly where defaultAreas puts them', () => {
    const areas = rowOfAreas()
    expect(rowArrangement(areas)).toEqual(new Map(areas.map((area) => [area.id, area.rect])))
  })

  it('puts four Areas in one row, in list order, tops aligned and 80 px apart', () => {
    const areas = areasOf([square, { w: 600, h: 700 }, square, { w: 1500, h: 520 }])
    const targets = rowArrangement(areas)
    expect([...targets.values()]).toEqual([
      { x: 80, y: 120, w: 980, h: 1000 },
      { x: 1140, y: 120, w: 600, h: 700 },
      { x: 1820, y: 120, w: 980, h: 1000 },
      { x: 2880, y: 120, w: 1500, h: 520 },
    ])
    expectSizesKeptAndIntegers(areas, targets)
  })
})

describe('starArrangement', () => {
  const big = { w: 1960, h: 2000 }

  function center(rect: { x: number; y: number; w: number; h: number }) {
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
  }

  /** The targets as Areas, to ask `jarRect` where the Jar goes. */
  function arranged(areas: readonly Area[], targets: Arrangement): Area[] {
    return areas.map((area) => ({ ...area, rect: targets.get(area.id)! }))
  }

  it.each([2, 3, 5, 12])('%i Areas of one size form a ring with the Jar in the middle', (count) => {
    const areas = same(count)
    expectRing(areas, starArrangement(areas))
  })

  it.each([
    [2, 0],
    [3, 1],
    [5, 2],
    [12, 7],
  ])('%i Areas, one of them (#%i) twice as big, still form a ring with the Jar in the middle', (count, bigIndex) => {
    const areas = areasOf(Array.from({ length: count }, (_, index) => (index === bigIndex ? big : square)))
    expectRing(areas, starArrangement(areas))
  })

  function expectRing(areas: readonly Area[], targets: Arrangement) {
    expectSizesKeptAndIntegers(areas, targets)
    for (const [a, b] of pairs(targets)) expect(overlaps(grown(a, AREA_GAP), b)).toBe(false)

    const centers = [...targets.values()].map(center)
    if (areas.length === 2) {
      expect(centers[0].x).toBeLessThan(centers[1].x)
    } else {
      for (const other of centers.slice(1)) expect(centers[0].y).toBeLessThan(other.y)
    }
    expect(Math.min(...[...targets.values()].map((rect) => rect.x))).toBe(80)
    expect(Math.min(...[...targets.values()].map((rect) => rect.y))).toBe(120)

    const jar = jarRect(arranged(areas, targets))!
    expect(jar).toEqual(centeredJar([...targets.values()]))
    for (const rect of targets.values()) expect(overlaps(rect, jarBounds(jar))).toBe(false)
  }

  it('turns clockwise from the top', () => {
    const [top, second, third, fourth] = [...starArrangement(same(4)).values()].map(center)
    expect(second.x).toBeGreaterThan(top.x)
    expect(third.y).toBeGreaterThan(second.y)
    expect(fourth.x).toBeLessThan(third.x)
  })

  it('is a row for a single Area', () => {
    const areas = same(1)
    expect(starArrangement(areas)).toEqual(rowArrangement(areas))
  })
})

describe('gridArrangement', () => {
  function columnsOf(targets: Arrangement) {
    return new Set([...targets.values()].map((rect) => rect.x)).size
  }

  it.each([
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 3],
    [9, 3],
    [10, 4],
  ])('%i Areas take %i columns', (count, columns) => {
    expect(columnsOf(gridArrangement(same(count)))).toBe(columns)
  })

  it('fills rows in list order: 3 + 2 for five Areas', () => {
    const targets = gridArrangement(same(5))
    expect([...targets.values()].map((rect) => [rect.x, rect.y])).toEqual([
      [80, 120],
      [1140, 120],
      [2200, 120],
      [80, 1280],
      [1140, 1280],
    ])
  })

  it('puts Trabajo and Vida in the first row and Recordar under Trabajo', () => {
    const [work, life, remember] = [...gridArrangement(rowOfAreas()).values()]
    expect(work).toEqual({ x: 80, y: 120, w: 980, h: 1000 })
    expect(life).toEqual({ x: 1140, y: 120, w: 980, h: 1000 })
    expect(remember).toEqual({ x: 80, y: 1280, w: 980, h: 1000 })
  })

  it('makes a column as wide as its widest Area and a row as tall as its tallest', () => {
    const areas = areasOf([
      { w: 600, h: 700 },
      { w: 980, h: 1000 },
      { w: 1960, h: 600 },
      { w: 520, h: 2000 },
    ])
    const targets = gridArrangement(areas)
    expect([...targets.values()]).toEqual([
      { x: 80, y: 120, w: 600, h: 700 },
      // Column 0 is as wide as its widest Area, 1960.
      { x: 2120, y: 120, w: 980, h: 1000 },
      // Row 0 is as tall as its tallest Area, 1000.
      { x: 80, y: 1280, w: 1960, h: 600 },
      { x: 2120, y: 1280, w: 520, h: 2000 },
    ])
    expectSizesKeptAndIntegers(areas, targets)
    expectNoOverlap(targets)
  })
})

describe('savedArrangement', () => {
  const saved = {
    a1: { x: 3000, y: 200, w: 980, h: 1000 },
    a2: { x: 80, y: 1500, w: 600, h: 1200 },
    gone: { x: 80, y: 120, w: 980, h: 1000 },
  }

  it('puts every saved Area back at its saved rect, size included, and ignores deleted ones', () => {
    const areas = same(2)
    expect(savedArrangement(areas, saved)).toEqual(
      new Map([
        ['a1', saved.a1],
        ['a2', saved.a2],
      ]),
    )
  })

  it('gives an Area created since the first free slot among the placed rects', () => {
    const areas = same(4)
    const targets = savedArrangement(areas, saved)
    // (80, 120) is free once "gone" is ignored; the next free slot after that is (1140, 120).
    expect(targets.get('a3')).toEqual({ x: 80, y: 120, w: 980, h: 1000 })
    expect(targets.get('a4')).toEqual({ x: 1140, y: 120, w: 980, h: 1000 })
    expectNoOverlap(targets)
  })
})

describe('canRestore', () => {
  it('needs a saved rect for at least one current Area', () => {
    const areas = rowOfAreas()
    expect(canRestore(areas, null)).toBe(false)
    expect(canRestore(areas, { rects: { other: areas[0].rect }, savedAt: 1 })).toBe(false)
    expect(canRestore(areas, { rects: { a2: areas[1].rect }, savedAt: 1 })).toBe(true)
  })
})

describe('isRecoverable', () => {
  /** The Areas moved to the given targets. */
  function at(areas: readonly Area[], targets: Arrangement): Area[] {
    return areas.map((area) => ({ ...area, rect: targets.get(area.id)! }))
  }

  function nudged(areas: readonly Area[]): Area[] {
    return areas.map((area, index) => (index === 0 ? { ...area, rect: { ...area.rect, x: area.rect.x + 1 } } : area))
  }

  it('is true for the default Desk with nothing saved', () => {
    expect(isRecoverable(rowOfAreas(), null)).toBe(true)
  })

  it.each([
    ['Fila', rowArrangement],
    ['Tabla', gridArrangement],
    ['Estrella', starArrangement],
  ])('is true for a Desk as %s left it, and false after a 1 px hand move', (_, arrange) => {
    const areas = at(same(5), arrange(same(5)))
    expect(isRecoverable(areas, null)).toBe(true)
    expect(isRecoverable(nudged(areas), null)).toBe(false)
  })

  it('is true for a Desk where the saved arrangement put it', () => {
    const areas = nudged(rowOfAreas())
    const saved = { rects: Object.fromEntries(areas.map((area) => [area.id, area.rect])), savedAt: 1 }
    expect(isRecoverable(areas, null)).toBe(false)
    expect(isRecoverable(areas, saved)).toBe(true)
    expect(isRecoverable(nudged(areas), saved)).toBe(false)
  })
})
