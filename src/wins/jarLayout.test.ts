import { describe, expect, it } from 'vitest'
import { makeArea, rowOfAreas } from '../test/fixtures'
import type { AreaColor } from '../types'
import { JAR_CAPACITY, isOverJar, jarBounds, jarPieces, jarRect } from './jarLayout'

describe('jarRect', () => {
  it('sits where the mockup has it for the default Areas', () => {
    expect(jarRect(rowOfAreas())).toEqual({ x: 1500, y: 1170, w: 260, h: 300 })
  })

  it('centers under any set of Areas, 50 px below the lowest', () => {
    const areas = [...rowOfAreas(), makeArea({ id: 'a4', rect: { x: 80, y: 1300, w: 980, h: 600 } })]
    expect(jarRect(areas)).toEqual({ x: 1500, y: 1950, w: 260, h: 300 })
    expect(jarRect([makeArea({ id: 'one', rect: { x: 0, y: 0, w: 1000, h: 500 } })])).toEqual({ x: 370, y: 550, w: 260, h: 300 })
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
