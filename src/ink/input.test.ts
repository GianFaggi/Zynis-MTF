import { describe, expect, it } from 'vitest'
import { inkPointer, isEraserEnd, pointerDown, shouldDraw } from './input'

describe('shouldDraw (design D5)', () => {
  it.each([
    ['pen', false, true],
    ['pen', true, true],
    ['mouse', false, true],
    ['mouse', true, true],
    ['touch', false, true],
    ['touch', true, false],
  ] as const)('%s with penSeen %s draws: %s', (pointerType, penSeen, draws) => {
    expect(shouldDraw({ pointerType, penSeen })).toBe(draws)
  })
})

describe('pointerDown', () => {
  it('starts a stroke when nothing is drawing and the pointer may draw', () => {
    expect(pointerDown({ pointerType: 'touch', penSeen: false, live: null })).toBe('draw')
    expect(pointerDown({ pointerType: 'pen', penSeen: true, live: null })).toBe('draw')
  })

  it('ignores a finger once a pen was seen', () => {
    expect(pointerDown({ pointerType: 'touch', penSeen: true, live: null })).toBe('ignore')
  })

  it('palm first: a pen during a finger stroke discards it and draws', () => {
    expect(pointerDown({ pointerType: 'pen', penSeen: false, live: 'touch' })).toBe('replace')
  })

  it('ignores any other second pointer during a stroke', () => {
    expect(pointerDown({ pointerType: 'touch', penSeen: false, live: 'touch' })).toBe('ignore')
    expect(pointerDown({ pointerType: 'touch', penSeen: true, live: 'pen' })).toBe('ignore')
    expect(pointerDown({ pointerType: 'mouse', penSeen: false, live: 'touch' })).toBe('ignore')
    expect(pointerDown({ pointerType: 'pen', penSeen: true, live: 'pen' })).toBe('ignore')
  })
})

describe('isEraserEnd', () => {
  it('is a pen with bit 32 of buttons set', () => {
    expect(isEraserEnd('pen', 32)).toBe(true)
    expect(isEraserEnd('pen', 33)).toBe(true)
    expect(isEraserEnd('pen', 1)).toBe(false)
    expect(isEraserEnd('mouse', 32)).toBe(false)
  })
})

describe('inkPointer', () => {
  it('keeps pen and touch, and treats anything else as the mouse', () => {
    expect(inkPointer('pen')).toBe('pen')
    expect(inkPointer('touch')).toBe('touch')
    expect(inkPointer('mouse')).toBe('mouse')
    expect(inkPointer('')).toBe('mouse')
  })
})
