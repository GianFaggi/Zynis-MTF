import { describe, expect, it } from 'vitest'
import { nextStepAt, waitStage } from './wait'

describe('waitStage', () => {
  it.each([
    [0, 'entering'],
    [1_499, 'entering'],
    [1_500, 'connecting'],
    [7_999, 'connecting'],
    [8_000, 'waking'],
    [29_999, 'waking'],
    [30_000, 'almost'],
    [89_999, 'almost'],
    [90_000, 'failed'],
    [60 * 60 * 1000, 'failed'],
  ])('%d ms → %s', (elapsed, stage) => {
    expect(waitStage(elapsed)).toBe(stage)
  })
})

describe('nextStepAt', () => {
  it.each([
    [0, 1_500],
    [1_499, 1_500],
    [1_500, 8_000],
    [40_000, 90_000],
    [90_000, null],
    [60 * 60 * 1000, null],
  ])('after %d ms → %s', (elapsed, next) => {
    expect(nextStepAt(elapsed)).toBe(next)
  })
})
