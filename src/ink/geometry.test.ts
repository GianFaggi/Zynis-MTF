import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE, INK_MAX_HEIGHT, INK_MAX_POINTS } from './constants'
import { addStroke, appendPoint, grownHeight, inkPressure, pointCount, segmentDistance, simplifyStroke, toBoxPoint } from './geometry'

const box = { left: 100, top: 50, width: 500 }

describe('toBoxPoint', () => {
  it('scales the screen point so the box is 1000 units wide, and rounds it', () => {
    expect(toBoxPoint(100, 50, box, 400)).toEqual({ x: 0, y: 0 })
    expect(toBoxPoint(350, 150, box, 400)).toEqual({ x: 500, y: 200 })
    expect(toBoxPoint(100.3, 50.6, box, 400)).toEqual({ x: 1, y: 1 })
  })

  it('gives the same box point on a narrower box: the handwriting keeps its layout', () => {
    expect(toBoxPoint(100 + 85, 50 + 34, { left: 100, top: 50, width: 170 }, 400)).toEqual({ x: 500, y: 200 })
  })

  it('clamps a point outside the box to its edge', () => {
    expect(toBoxPoint(20, 10, box, 400)).toEqual({ x: 0, y: 0 })
    expect(toBoxPoint(900, 900, box, 400)).toEqual({ x: 1000, y: 400 })
  })
})

describe('inkPressure', () => {
  it('keeps a pen pressure as 1–100', () => {
    expect(inkPressure('pen', 0.73)).toBe(73)
    expect(inkPressure('pen', 1)).toBe(100)
    expect(inkPressure('pen', 0.001)).toBe(1)
  })

  it.each([
    ['the mouse', 'mouse', 0.5],
    ['the finger', 'touch', 0.8],
    ['a pen reporting 0', 'pen', 0],
    ['a pen reporting nothing', 'pen', NaN],
  ])('gives %s a flat 50', (_, pointerType, pressure) => {
    expect(inkPressure(pointerType, pressure)).toBe(50)
  })
})

describe('appendPoint', () => {
  it('always keeps the first point', () => {
    const stroke: number[] = []
    expect(appendPoint(stroke, 5, 5, 50)).toBe(true)
    expect(stroke).toEqual([5, 5, 50])
  })

  it('skips a point closer than 2 units to the last kept one', () => {
    const stroke = [5, 5, 50]
    expect(appendPoint(stroke, 6, 6, 60)).toBe(false)
    expect(appendPoint(stroke, 7, 5, 60)).toBe(true)
    expect(stroke).toEqual([5, 5, 50, 7, 5, 60])
  })
})

describe('segmentDistance', () => {
  it('measures to the nearest point of the segment, ends included', () => {
    expect(segmentDistance(5, 3, 0, 0, 10, 0)).toBe(3)
    expect(segmentDistance(13, 4, 0, 0, 10, 0)).toBe(5)
    expect(segmentDistance(3, 4, 0, 0, 0, 0)).toBe(5)
  })
})

describe('simplifyStroke', () => {
  it('drops points on a straight line and keeps the ends with their pressure', () => {
    expect(simplifyStroke([0, 0, 10, 10, 0, 20, 20, 0, 30, 30, 0, 40])).toEqual([0, 0, 10, 30, 0, 40])
  })

  it('keeps a corner', () => {
    expect(simplifyStroke([0, 0, 50, 10, 0, 50, 20, 0, 50, 20, 10, 50, 20, 20, 50])).toEqual([0, 0, 50, 20, 0, 50, 20, 20, 50])
  })

  it('keeps a point barely off the line within the tolerance out, and one beyond it in', () => {
    expect(simplifyStroke([0, 0, 50, 10, 0.5, 50, 20, 0, 50])).toEqual([0, 0, 50, 20, 0, 50])
    expect(simplifyStroke([0, 0, 50, 10, 2, 50, 20, 0, 50])).toEqual([0, 0, 50, 10, 2, 50, 20, 0, 50])
  })

  it('leaves a one- or two-point stroke as it is', () => {
    expect(simplifyStroke([4, 4, 50])).toEqual([4, 4, 50])
    expect(simplifyStroke([4, 4, 50, 9, 9, 50])).toEqual([4, 4, 50, 9, 9, 50])
  })
})

describe('grownHeight', () => {
  it('grows by 250 when a point falls below height - 120', () => {
    expect(grownHeight(400, [10, 100, 50, 20, 281, 50])).toBe(650)
  })

  it('does not grow when the stroke stays above that line', () => {
    expect(grownHeight(400, [10, 100, 50, 20, 280, 50])).toBe(400)
  })

  it('never passes the maximum', () => {
    expect(grownHeight(2400, [10, 2390, 50])).toBe(INK_MAX_HEIGHT)
    expect(grownHeight(INK_MAX_HEIGHT, [10, 2490, 50])).toBe(INK_MAX_HEIGHT)
  })
})

describe('addStroke', () => {
  const first = [100, 100, 50, 120, 100, 50]

  it('adds the simplified stroke and keeps the earlier ones where they were', () => {
    const ink = { height: 400, strokes: [first] }
    const next = addStroke(ink, [0, 0, 10, 10, 0, 20, 20, 0, 30], DEFAULT_STYLE)!
    expect(next.strokes).toEqual([first, [0, 0, 10, 20, 0, 30]])
    expect(next.strokes[0]).toBe(first)
    expect(next.height).toBe(400)
  })

  it('grows the box without moving any point already drawn', () => {
    const ink = { height: 400, strokes: [first] }
    const next = addStroke(ink, [500, 350, 50], DEFAULT_STYLE)!
    expect(next.height).toBe(650)
    expect(next.strokes[0]).toEqual(first)
  })

  it('reports a stroke past the limit as not fitting', () => {
    const full = { height: 400, strokes: [Array.from({ length: INK_MAX_POINTS }, (_, i) => [i % 1000, 5, 50]).flat()] }
    expect(pointCount(full)).toBe(INK_MAX_POINTS)
    expect(addStroke(full, [1, 1, 50], DEFAULT_STYLE)).toBeNull()
  })

  it('accepts a stroke that exactly reaches the limit', () => {
    const almost = { height: 400, strokes: [Array.from({ length: INK_MAX_POINTS - 1 }, (_, i) => [i % 1000, 5, 50]).flat()] }
    expect(addStroke(almost, [1, 1, 50], DEFAULT_STYLE)?.strokes).toHaveLength(2)
  })

  const red = { color: '#d0443a', size: 12 }

  it('adding a styled stroke to Tinta-only handwriting gives styles aligned with the strokes', () => {
    const next = addStroke({ height: 400, strokes: [first] }, [500, 100, 50], red)!
    expect(next.styles).toEqual([DEFAULT_STYLE, red])
    expect(next.styles).toHaveLength(next.strokes.length)
  })

  it('adding a Tinta Medio stroke to Tinta-only handwriting keeps the #47 shape, with no styles key', () => {
    const next = addStroke({ height: 400, strokes: [first] }, [500, 100, 50], DEFAULT_STYLE)!
    expect(next).toEqual({ height: 400, strokes: [first, [500, 100, 50]] })
    expect('styles' in next).toBe(false)
  })

  it('keeps the earlier styles when adding to styled handwriting', () => {
    const next = addStroke({ height: 400, strokes: [first], styles: [red] }, [500, 100, 50], DEFAULT_STYLE)!
    expect(next.styles).toEqual([red, DEFAULT_STYLE])
  })

  it('over styles that no longer line up, the earlier strokes become Tinta Medio', () => {
    const mismatched = { height: 400, strokes: [first, [1, 1, 50]], styles: [red] }
    expect(addStroke(mismatched, [500, 100, 50], red)!.styles).toEqual([DEFAULT_STYLE, DEFAULT_STYLE, red])
  })

  it('a styled stroke past the limit is still not kept', () => {
    const full = { height: 400, strokes: [Array.from({ length: INK_MAX_POINTS }, (_, i) => [i % 1000, 5, 50]).flat()] }
    expect(addStroke(full, [1, 1, 50], red)).toBeNull()
  })
})
