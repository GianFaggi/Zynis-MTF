import { describe, expect, it } from 'vitest'
import { overlaps } from '../desk/areas'
import { makeArea, rowOfAreas } from '../test/fixtures'
import type { AreaColor } from '../types'
import { JAR_CAPACITY, areaJarRect, isOverAreaJar, isOverJar, jarBounds, jarPieces, jarRect, jarTarget } from './jarLayout'

describe('jarRect', () => {
  it('sits where the mockup has it for the default Areas', () => {
    expect(jarRect(rowOfAreas())).toEqual({ x: 1500, y: 1170, w: 260, h: 300 })
  })

  it('centers under any set of Areas, 50 px below the lowest', () => {
    const areas = [...rowOfAreas(), makeArea({ id: 'a4', rect: { x: 80, y: 1300, w: 980, h: 600 } })]
    expect(jarRect(areas)).toEqual({ x: 1500, y: 1950, w: 260, h: 300 })
    expect(jarRect([makeArea({ id: 'one', rect: { x: 0, y: 0, w: 1000, h: 500 } })])).toEqual({ x: 370, y: 550, w: 260, h: 300 })
  })

  it('stays below a row of four and a 2 × 2 grid, whose middle is taken', () => {
    const row = [...rowOfAreas(), makeArea({ id: 'a4', rect: { x: 3260, y: 120, w: 980, h: 1000 } })]
    expect(jarRect(row)).toEqual({ x: 2030, y: 1170, w: 260, h: 300 })

    const grid = [
      makeArea({ id: 'a1', rect: { x: 80, y: 120, w: 980, h: 1000 } }),
      makeArea({ id: 'a2', rect: { x: 1140, y: 120, w: 980, h: 1000 } }),
      makeArea({ id: 'a3', rect: { x: 80, y: 1280, w: 980, h: 1000 } }),
      makeArea({ id: 'a4', rect: { x: 1140, y: 1280, w: 980, h: 1000 } }),
    ]
    expect(jarRect(grid)).toEqual({ x: 970, y: 2330, w: 260, h: 300 })
  })

  it('goes to the middle of Areas standing around an empty center, overlapping none of them', () => {
    const ring = [
      makeArea({ id: 'a1', rect: { x: 0, y: 0, w: 980, h: 1000 } }),
      makeArea({ id: 'a2', rect: { x: 2000, y: 0, w: 980, h: 1000 } }),
      makeArea({ id: 'a3', rect: { x: 0, y: 2000, w: 980, h: 1000 } }),
      makeArea({ id: 'a4', rect: { x: 2000, y: 2000, w: 980, h: 1000 } }),
    ]
    const jar = jarRect(ring)!
    // The Jar and its caption are centered on the Areas' box, (1490, 1500).
    const block = jarBounds(jar)
    expect([block.x + block.w / 2, block.y + block.h / 2]).toEqual([1490, 1500])
    expect(jar).toEqual({ x: 1360, y: 1298, w: 260, h: 300 })
    for (const area of ring) expect(overlaps(area.rect, block)).toBe(false)
  })

  it('keeps 50 px of paper around the Jar and its caption in the middle, or goes below', () => {
    // Two Areas left and right: the block is 360 px wide, so it needs 460 px between them.
    const apart = (gap: number) => [
      makeArea({ id: 'a1', rect: { x: 0, y: 0, w: 980, h: 1000 } }),
      makeArea({ id: 'a2', rect: { x: 980 + gap, y: 0, w: 980, h: 1000 } }),
    ]
    expect(jarRect(apart(460))!.y).toBeLessThan(1000)
    expect(jarRect(apart(458))!.y).toBe(1050)
  })

  it('is null without Areas', () => {
    expect(jarRect([])).toBeNull()
  })
})

describe('jarBounds', () => {
  it('adds the caption, which is wider than the Jar', () => {
    expect(jarBounds({ x: 1500, y: 1170, w: 260, h: 300 })).toEqual({ x: 1450, y: 1170, w: 360, h: 404 })
  })
})

describe('isOverJar', () => {
  const jar = { x: 1500, y: 1170, w: 260, h: 300 }

  it.each([
    ['left', { x: 1451, y: 1300 }, { x: 1450, y: 1300 }],
    ['right', { x: 1809, y: 1300 }, { x: 1810, y: 1300 }],
    ['top', { x: 1630, y: 1111 }, { x: 1630, y: 1110 }],
    ['bottom', { x: 1630, y: 1499 }, { x: 1630, y: 1500 }],
  ])('%s margin: just inside counts, just outside does not', (_, inside, outside) => {
    expect(isOverJar(jar, inside)).toBe(true)
    expect(isOverJar(jar, outside)).toBe(false)
  })
})

describe('areaJarRect', () => {
  it('sits in the top-right corner of the default Vida, above where Tidy up starts', () => {
    const vida = rowOfAreas()[1].rect
    const jar = areaJarRect(vida)
    expect(jar).toEqual({ x: 1992, y: 136, w: 104, h: 120 })
    expect(vida.x + vida.w - (jar.x + jar.w)).toBe(24)
    expect(jar.y - vida.y).toBe(16)
    expect(jar.y + jar.h - vida.y).toBeLessThan(140)
  })
})

describe('isOverAreaJar', () => {
  const jar = { x: 1992, y: 136, w: 104, h: 120 }

  it.each([
    ['left', { x: 1963, y: 200 }, { x: 1962, y: 200 }],
    ['right', { x: 2125, y: 200 }, { x: 2126, y: 200 }],
    ['top', { x: 2040, y: 107 }, { x: 2040, y: 106 }],
    ['bottom', { x: 2040, y: 285 }, { x: 2040, y: 286 }],
  ])('%s margin: just inside counts, just outside does not', (_, inside, outside) => {
    expect(isOverAreaJar(jar, inside)).toBe(true)
    expect(isOverAreaJar(jar, outside)).toBe(false)
  })
})

describe('jarTarget', () => {
  const areas = rowOfAreas()
  const overVidaJar = { x: 2044, y: 196 }
  const overDeskJar = { x: 1630, y: 1320 }
  const on = { areaJars: true, far: false }

  it('over an Area Jar is that Area; over the Desk Jar is the Desk; elsewhere nothing', () => {
    expect(jarTarget(areas, overVidaJar, on)).toEqual({ areaId: 'a2' })
    expect(jarTarget(areas, overDeskJar, on)).toEqual({ areaId: null })
    expect(jarTarget(areas, { x: 1600, y: 600 }, on)).toBeNull()
  })

  it('never returns an Area Jar with the option off or in the far look', () => {
    expect(jarTarget(areas, overVidaJar, { areaJars: false, far: false })).toBeNull()
    expect(jarTarget(areas, overVidaJar, { areaJars: true, far: true })).toBeNull()
    expect(jarTarget(areas, overDeskJar, { areaJars: true, far: true })).toEqual({ areaId: null })
  })

  it('is null without Areas', () => {
    expect(jarTarget([], overDeskJar, on)).toBeNull()
  })
})

describe('jarPieces', () => {
  const colors: AreaColor[] = ['sage', 'sand', 'sand', 'sky']

  it('one piece per color, in order, inside the glass', () => {
    const pieces = jarPieces(colors)
    expect(pieces.map((piece) => piece.color)).toEqual(colors)
    for (const piece of pieces) {
      expect(piece.x).toBeGreaterThanOrEqual(40)
      expect(piece.x + 21).toBeLessThanOrEqual(220)
      expect(piece.y).toBeGreaterThanOrEqual(96)
      expect(piece.y + 13).toBeLessThanOrEqual(292)
      expect(Math.abs(piece.rotate)).toBeLessThanOrEqual(38)
    }
  })

  it('is the same on every call', () => {
    expect(jarPieces(colors)).toEqual(jarPieces(colors))
  })

  it('the first pieces lie at the bottom and later ones higher up', () => {
    const pieces = jarPieces(Array.from({ length: 15 }, () => 'sage' as const))
    expect(pieces[14].y).toBeLessThan(pieces[0].y)
  })

  it('stops at capacity, however many Cards are in the Jar', () => {
    const many = Array.from({ length: JAR_CAPACITY + 30 }, () => 'sky' as const)
    expect(jarPieces(many)).toHaveLength(JAR_CAPACITY)
    const top = jarPieces(many).at(-1)!
    expect(top.y).toBeGreaterThanOrEqual(96)
  })
})
