import { afterEach, describe, expect, it, vi } from 'vitest'
import * as freehand from 'perfect-freehand'
import { inkPaths, strokePath } from './render'

vi.mock('perfect-freehand', { spy: true })

afterEach(() => {
  vi.clearAllMocks()
})

/** The width of an outline's bounding box across a horizontal stroke: its thickness. */
function thickness(d: string): number {
  const ys = [...d.matchAll(/[\d.-]+,([\d.-]+)/g)].map((match) => Number(match[1]))
  return Math.max(...ys) - Math.min(...ys)
}

describe('inkPaths', () => {
  it('returns one closed path per stroke', () => {
    const paths = inkPaths({ height: 400, strokes: [[10, 10, 50, 200, 40, 50], [300, 300, 80, 320, 340, 20, 360, 300, 60]] })
    expect(paths).toHaveLength(2)
    for (const { d } of paths) expect(d).toMatch(/^M[\d.-]+,[\d.-]+Q.*Z$/)
  })

  it('computes a stroke array once per width, and again only for a new array or another width', () => {
    const stroke = [10, 10, 50, 200, 40, 50]
    const first = inkPaths({ height: 400, strokes: [stroke] })
    const calls = vi.mocked(freehand.getStroke).mock.calls.length
    expect(inkPaths({ height: 650, strokes: [stroke] })).toEqual(first)
    expect(inkPaths({ height: 400, strokes: [stroke], styles: [{ color: '#d0443a', size: 7 }] })[0].d).toBe(first[0].d)
    expect(freehand.getStroke).toHaveBeenCalledTimes(calls)

    inkPaths({ height: 400, strokes: [[...stroke]] })
    expect(freehand.getStroke).toHaveBeenCalledTimes(calls + 1)

    inkPaths({ height: 400, strokes: [stroke], styles: [{ color: null, size: 12 }] })
    expect(freehand.getStroke).toHaveBeenCalledTimes(calls + 2)
    inkPaths({ height: 400, strokes: [stroke], styles: [{ color: null, size: 12 }] })
    expect(freehand.getStroke).toHaveBeenCalledTimes(calls + 2)
  })

  it('a Grueso (12) stroke is wider than the same stroke at Fino (4)', () => {
    const stroke = [100, 100, 50, 300, 100, 50, 500, 100, 50]
    const [bold] = inkPaths({ height: 400, strokes: [stroke], styles: [{ color: null, size: 12 }] })
    const [fine] = inkPaths({ height: 400, strokes: [stroke], styles: [{ color: null, size: 4 }] })
    expect(thickness(bold.d)).toBeGreaterThan(thickness(fine.d) * 2)
  })

  it('colors follow the styles, and are null (Tinta) without them or when they do not line up', () => {
    const strokes = [[10, 10, 50], [20, 20, 50]]
    expect(inkPaths({ height: 400, strokes, styles: [{ color: '#d0443a', size: 7 }, { color: null, size: 4 }] }).map((path) => path.color)).toEqual(['#d0443a', null])
    expect(inkPaths({ height: 400, strokes }).map((path) => path.color)).toEqual([null, null])
    expect(inkPaths({ height: 400, strokes, styles: [{ color: '#d0443a', size: 7 }] }).map((path) => path.color)).toEqual([null, null])
  })

  it('still draws a dot for a one-point stroke', () => {
    const [{ d }] = inkPaths({ height: 400, strokes: [[500, 200, 50]] })
    expect(d).toMatch(/^M.*Z$/)
    expect(d.length).toBeGreaterThan(20)
  })

  it('passes the pressure as 0–1 and the width, and never simulates pressure', () => {
    strokePath([0, 0, 100, 50, 0, 25], true, 12)
    const [points, options] = vi.mocked(freehand.getStroke).mock.calls.at(-1)!
    expect(points).toEqual([
      [0, 0, 1],
      [50, 0, 0.25],
    ])
    expect(options).toMatchObject({ simulatePressure: false, last: true, size: 12 })
  })

  it('without a width, draws at Medio (7), #47’s width', () => {
    strokePath([0, 0, 50])
    expect(vi.mocked(freehand.getStroke).mock.calls.at(-1)![1]).toMatchObject({ size: 7 })
  })
})
