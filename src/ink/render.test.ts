import { afterEach, describe, expect, it, vi } from 'vitest'
import * as freehand from 'perfect-freehand'
import { inkPaths, strokePath } from './render'

vi.mock('perfect-freehand', { spy: true })

afterEach(() => {
  vi.clearAllMocks()
})

describe('inkPaths', () => {
  it('returns one closed path per stroke', () => {
    const paths = inkPaths({ height: 400, strokes: [[10, 10, 50, 200, 40, 50], [300, 300, 80, 320, 340, 20, 360, 300, 60]] })
    expect(paths).toHaveLength(2)
    for (const d of paths) expect(d).toMatch(/^M[\d.-]+,[\d.-]+Q.*Z$/)
  })

  it('computes a stroke array once, and again only for a new array', () => {
    const stroke = [10, 10, 50, 200, 40, 50]
    const first = inkPaths({ height: 400, strokes: [stroke] })
    const calls = vi.mocked(freehand.getStroke).mock.calls.length
    expect(inkPaths({ height: 650, strokes: [stroke] })).toEqual(first)
    expect(freehand.getStroke).toHaveBeenCalledTimes(calls)

    inkPaths({ height: 400, strokes: [[...stroke]] })
    expect(freehand.getStroke).toHaveBeenCalledTimes(calls + 1)
  })

  it('still draws a dot for a one-point stroke', () => {
    const [d] = inkPaths({ height: 400, strokes: [[500, 200, 50]] })
    expect(d).toMatch(/^M.*Z$/)
    expect(d.length).toBeGreaterThan(20)
  })

  it('passes the pressure as 0–1 and never simulates it', () => {
    strokePath([0, 0, 100, 50, 0, 25])
    const [points, options] = vi.mocked(freehand.getStroke).mock.calls.at(-1)!
    expect(points).toEqual([
      [0, 0, 1],
      [50, 0, 0.25],
    ])
    expect(options).toMatchObject({ simulatePressure: false, last: true })
  })
})
