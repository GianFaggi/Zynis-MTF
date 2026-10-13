import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test/fixtures'
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

  it("with an Area counts that Area's Wins only; without one counts them all", () => {
    const at = new Date(2026, 9, 14, 9).getTime()
    resetStores({
      cards: [makeCard({ id: 'c1', areaId: 'a1' }), makeCard({ id: 'c2', areaId: 'a2' })],
      events: [
        { id: 'e1', type: 'item', at, cardId: 'c1', areaId: 'a1' },
        { id: 'e2', type: 'item', at, cardId: 'c2', areaId: 'a1' },
        { id: 'e3', type: 'card', at, cardId: 'c2', areaId: 'a2' },
      ],
    })
    expect(renderHook(() => useWinStats()).result.current.week.done).toBe(3)
    expect(renderHook(() => useWinStats(null)).result.current.week.done).toBe(3)
    expect(renderHook(() => useWinStats('a1')).result.current.week.done).toBe(1)
    expect(renderHook(() => useWinStats('a2')).result.current.week.done).toBe(2)
  })
})
