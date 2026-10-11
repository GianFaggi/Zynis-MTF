import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStores } from '../test/stores'
import { useWinStats } from './useWinStats'

describe('useWinStats', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 14, 23, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves on to the new day at midnight', () => {
    resetStores({ events: [{ id: 'e1', type: 'item', at: new Date(2026, 9, 14, 9).getTime() }] })
    const { result } = renderHook(() => useWinStats())
    expect(result.current.days[6].count).toBe(1)

    act(() => vi.advanceTimersByTime(60 * 60 * 1000))
    expect(new Date(result.current.now).getDate()).toBe(15)
    expect(result.current.days[5].count).toBe(1) // yesterday now
    expect(result.current.days[6].count).toBe(0)
  })
})
