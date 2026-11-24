import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE } from './constants'
import { strokeStyles, withStyles } from './style'

const a = [10, 10, 50]
const b = [20, 20, 50]
const red = { color: '#d0443a', size: 12 }
const fineInk = { color: null, size: 4 }

describe('strokeStyles', () => {
  it('without styles, every stroke is Tinta Medio', () => {
    expect(strokeStyles({ height: 400, strokes: [a, b] })).toEqual([DEFAULT_STYLE, DEFAULT_STYLE])
  })

  it('gives the stored styles when they line up with the strokes', () => {
    expect(strokeStyles({ height: 400, strokes: [a, b], styles: [red, fineInk] })).toEqual([red, fineInk])
  })

  it('a length that differs from the strokes (left by a version without pens) gives all Tinta Medio', () => {
    expect(strokeStyles({ height: 400, strokes: [a], styles: [red, fineInk] })).toEqual([DEFAULT_STYLE])
    expect(strokeStyles({ height: 400, strokes: [a, b], styles: [red] })).toEqual([DEFAULT_STYLE, DEFAULT_STYLE])
  })

  it('no strokes, no styles', () => {
    expect(strokeStyles({ height: 400, strokes: [] })).toEqual([])
  })
})

describe('withStyles', () => {
  it('leaves out styles when every stroke is Tinta Medio', () => {
    const ink = withStyles(400, [a, b], [DEFAULT_STYLE, { color: null, size: 7 }])
    expect(ink).toEqual({ height: 400, strokes: [a, b] })
    expect('styles' in ink).toBe(false)
  })

  it('keeps every style, Tinta Medio included, as soon as one differs', () => {
    expect(withStyles(400, [a, b], [DEFAULT_STYLE, fineInk])).toEqual({ height: 400, strokes: [a, b], styles: [DEFAULT_STYLE, fineInk] })
  })

  it('an empty box has no styles', () => {
    expect('styles' in withStyles(400, [], [])).toBe(false)
  })
})
