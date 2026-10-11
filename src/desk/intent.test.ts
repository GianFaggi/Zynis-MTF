import { describe, expect, it } from 'vitest'
import { nextIntent, releaseOutcome } from './intent'

describe('nextIntent', () => {
  it.each(['mouse', 'pen'] as const)('%s on a Card: more than 4 px starts a drag', (pointerType) => {
    expect(nextIntent({ intent: 'pending', pointerType, distance: 4, held: false })).toBe('pending')
    expect(nextIntent({ intent: 'pending', pointerType, distance: 4.5, held: false })).toBe('drag')
  })

  it('touch on a Card: moving more than 9 px before the hold pans the Desk', () => {
    expect(nextIntent({ intent: 'pending', pointerType: 'touch', distance: 9, held: false })).toBe('pending')
    expect(nextIntent({ intent: 'pending', pointerType: 'touch', distance: 10, held: false })).toBe('pan')
  })

  it('touch on a Card: the hold picks it up', () => {
    expect(nextIntent({ intent: 'pending', pointerType: 'touch', distance: 3, held: true })).toBe('drag')
  })

  it('a pan or a drag stays what it is', () => {
    expect(nextIntent({ intent: 'pan', pointerType: 'touch', distance: 0, held: true })).toBe('pan')
    expect(nextIntent({ intent: 'pan', pointerType: 'mouse', distance: 50, held: false })).toBe('pan')
    expect(nextIntent({ intent: 'drag', pointerType: 'touch', distance: 50, held: false })).toBe('drag')
  })
})

describe('releaseOutcome', () => {
  it('a short release on a Card opens it', () => {
    expect(releaseOutcome({ intent: 'pending', distance: 2, onLabel: false })).toBe('open')
  })

  it('releasing a dragged Card drops it', () => {
    expect(releaseOutcome({ intent: 'drag', distance: 300, onLabel: false })).toBe('drop')
  })

  it('a small release on an Area label is a tap on the label', () => {
    expect(releaseOutcome({ intent: 'pan', distance: 5, onLabel: true })).toBe('label')
  })

  it('a small release on empty paper, or a real pan, does nothing', () => {
    expect(releaseOutcome({ intent: 'pan', distance: 5, onLabel: false })).toBe('none')
    expect(releaseOutcome({ intent: 'pan', distance: 6, onLabel: true })).toBe('none')
  })
})
