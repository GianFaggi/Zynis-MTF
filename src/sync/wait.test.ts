import { describe, expect, it } from 'vitest'
import { WAIT_LIMIT, WAIT_STEPS, nextStepAt, waitStage } from './wait'

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

describe('WAIT_LIMIT', () => {
  it('is when the timeline gives up: 90 seconds', () => {
    expect(WAIT_LIMIT).toBe(90_000)
    expect(waitStage(WAIT_LIMIT)).toBe('failed')
    expect(waitStage(WAIT_LIMIT - 1)).not.toBe('failed')
  })

  it('is the last step, so nothing is shown after a request gave up', () => {
    expect(WAIT_STEPS.at(-1)!.at).toBe(WAIT_LIMIT)
    expect(nextStepAt(WAIT_LIMIT)).toBeNull()
  })
})
