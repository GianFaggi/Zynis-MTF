import { describe, expect, it } from 'vitest'
import { eraseAlong, eraseSegment, strokeHit } from './erase'

// Two horizontal strokes, 200 units apart.
const top = [100, 100, 50, 400, 100, 50]
const bottom = [100, 300, 50, 400, 300, 50]

describe('eraseAlong', () => {
  it('a path crossing one stroke removes only that one', () => {
    // A vertical pass through the top stroke, its ends far from both strokes.
    expect(eraseAlong([top, bottom], [250, 40, 250, 160])).toEqual([bottom])
  })

  it('a path near but not touching removes nothing, and returns the same strokes', () => {
    const strokes = [top, bottom]
    expect(eraseAlong(strokes, [100, 130, 400, 130])).toBe(strokes)
  })

  it('a path within the radius of a stroke removes it', () => {
    expect(eraseAlong([top, bottom], [100, 110, 400, 110])).toEqual([bottom])
  })

  it('a single-point stroke can be erased', () => {
    const dot = [600, 600, 50]
    expect(eraseAlong([top, dot], [590, 590, 610, 610])).toEqual([top])
  })

  it('a single-point path erases around that point', () => {
    expect(eraseAlong([top, bottom], [250, 105])).toEqual([bottom])
  })

  it('a long path can remove several strokes', () => {
    expect(eraseAlong([top, bottom], [250, 40, 250, 360])).toEqual([])
  })
})

describe('strokeHit / eraseSegment', () => {
  it('hits a stroke whose segment crosses the eraser segment, even with every end far away', () => {
    expect(strokeHit(top, 250, 0, 250, 200)).toBe(true)
    expect(eraseSegment([top], 250, 0, 250, 200)).toEqual([])
  })

  it('misses a stroke out of reach', () => {
    expect(strokeHit(top, 500, 0, 500, 200)).toBe(false)
  })
})
