import { describe, expect, it } from 'vitest'
import { nextIntent, releaseOutcome } from './intent'

// A press on an Area label starts `pending` too, so every Card rule below is also the
// rule for moving an Area by its label.

describe('nextIntent', () => {
  it.each(['mouse', 'pen'] as const)('%s on a Card or a label: more than 4 px starts a drag', (pointerType) => {
    expect(nextIntent({ intent: 'pending', pointerType, distance: 4, held: false })).toBe('pending')
    expect(nextIntent({ intent: 'pending', pointerType, distance: 4.5, held: false })).toBe('drag')
  })

  it('touch on a Card or a label: moving more than 9 px before the hold pans the Desk', () => {
    expect(nextIntent({ intent: 'pending', pointerType: 'touch', distance: 9, held: false })).toBe('pending')
    expect(nextIntent({ intent: 'pending', pointerType: 'touch', distance: 10, held: false })).toBe('pan')
  })

  it('touch on a Card or a label: the hold picks it up', () => {
    expect(nextIntent({ intent: 'pending', pointerType: 'touch', distance: 3, held: true })).toBe('drag')
  })

  it('a pan, a drag or a resize stays what it is', () => {
    expect(nextIntent({ intent: 'pan', pointerType: 'touch', distance: 0, held: true })).toBe('pan')
    expect(nextIntent({ intent: 'pan', pointerType: 'mouse', distance: 50, held: false })).toBe('pan')
    expect(nextIntent({ intent: 'drag', pointerType: 'touch', distance: 50, held: false })).toBe('drag')
    expect(nextIntent({ intent: 'resize', pointerType: 'touch', distance: 50, held: false })).toBe('resize')
    expect(nextIntent({ intent: 'resize', pointerType: 'mouse', distance: 0, held: false })).toBe('resize')
  })
})

describe('releaseOutcome', () => {
  it('a short release on a Card opens it', () => {
    expect(releaseOutcome({ intent: 'pending', distance: 2, onLabel: false })).toBe('open')
  })

  it('releasing a dragged Card or Area drops it', () => {
    expect(releaseOutcome({ intent: 'drag', distance: 300, onLabel: false })).toBe('drop')
    expect(releaseOutcome({ intent: 'drag', distance: 300, onLabel: true })).toBe('drop')
  })

  it('a short press on an Area label is a tap on the label', () => {
    expect(releaseOutcome({ intent: 'pending', distance: 0, onLabel: true })).toBe('label')
    expect(releaseOutcome({ intent: 'pending', distance: 8, onLabel: true })).toBe('label')
  })

  it('a touch swipe over a label is a pan and does nothing on release', () => {
    expect(releaseOutcome({ intent: 'pan', distance: 40, onLabel: true })).toBe('none')
  })

  it('releasing a resize ends it, however far it went', () => {
    expect(releaseOutcome({ intent: 'resize', distance: 0, onLabel: false })).toBe('resize')
    expect(releaseOutcome({ intent: 'resize', distance: 400, onLabel: false })).toBe('resize')
  })

  it('a small release on the Jar is a tap on the Jar; a real pan from it is a pan', () => {
    expect(releaseOutcome({ intent: 'pan', distance: 5, onLabel: false, onJar: true })).toBe('jar')
    expect(releaseOutcome({ intent: 'pan', distance: 6, onLabel: false, onJar: true })).toBe('none')
  })

  it('a small release on empty paper, or a real pan, does nothing', () => {
    expect(releaseOutcome({ intent: 'pan', distance: 5, onLabel: false })).toBe('none')
    expect(releaseOutcome({ intent: 'pan', distance: 6, onLabel: false })).toBe('none')
  })
})
