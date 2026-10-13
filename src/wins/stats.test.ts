import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCard } from '../test/fixtures'
import type { WinEvent } from '../types'
import { dayStart, daysAgo, eventsOfArea, totalDone, winStats } from './stats'

// "Today" is pinned with fake timers (Date only), so the 7-day window is the same on
// every run. Events are placed at local noon N calendar days before today.

const NOW = new Date(2026, 9, 14, 18, 30).getTime() // Wednesday 14 October 2026, 18:30 local

function at(daysBefore: number, hour = 12) {
  const now = new Date(Date.now())
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBefore, hour).getTime()
}

let n = 0
function event(type: WinEvent['type'], when: number): WinEvent {
  return { id: `e${++n}`, type, at: when }
}

describe('winStats', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a Win 6 days ago is in the week; 7 days ago it only counts in the total', () => {
    const stats = winStats([event('item', at(6)), event('item', at(7))], Date.now())
    expect(stats.week.done).toBe(1)
    expect(stats.days[0]).toEqual({ start: dayStart(at(6)), count: 1 })
    expect(stats.total).toBe(2)
  })

  it('counts per day, oldest first and today last', () => {
    const events = [event('item', at(0, 9)), event('card', at(0, 23)), event('item', at(2)), event('item', at(2)), event('item', at(2))]
    const stats = winStats(events, Date.now())
    expect(stats.days.map((day) => day.count)).toEqual([0, 0, 0, 0, 3, 0, 2])
    expect(stats.days[6].start).toBe(dayStart(Date.now()))
  })

  it('splits the week into Items, Cards and notes; notes are not things done', () => {
    const events = [
      ...Array.from({ length: 5 }, () => event('item', at(1))),
      event('card', at(1)),
      event('card', at(3)),
      ...Array.from({ length: 3 }, () => event('note', at(0))),
    ]
    const stats = winStats(events, Date.now())
    expect(stats.week).toEqual({ items: 5, cards: 2, notes: 3, done: 7 })
    expect(stats.total).toBe(7)
    expect(stats.days.reduce((sum, day) => sum + day.count, 0)).toBe(7)
  })

  it('the best day is the highest; a tie goes to the most recent day', () => {
    const events = [event('item', at(4)), event('item', at(4)), event('item', at(1)), event('item', at(1)), event('item', at(0))]
    expect(winStats(events, Date.now()).best).toEqual({ start: dayStart(at(1)), count: 2 })
  })

  it('a quiet week has no best day', () => {
    const stats = winStats([event('item', at(30)), event('note', at(0))], Date.now())
    expect(stats.best).toBeNull()
    expect(stats.week.done).toBe(0)
    expect(stats.total).toBe(1)
  })

  it('totalDone is the same total, without today', () => {
    const events = [event('item', at(40)), event('card', at(3)), event('note', at(0)), event('item', at(0))]
    expect(totalDone(events)).toBe(3)
    expect(totalDone(events)).toBe(winStats(events, Date.now()).total)
  })
})

describe('across a daylight-saving change', () => {
  beforeEach(() => {
    // Madrid moves its clocks forward on Sunday 29 March 2026: that day lasts 23 hours.
    // Node reads `TZ` on every date calculation, so stubbing it switches the zone.
    vi.stubEnv('TZ', 'Europe/Madrid')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 3, 2, 0, 30)) // Thursday 2 April, just after midnight
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('still has 7 distinct days, each starting at local midnight', () => {
    // Guard: the time zone really changed, so this week really spans a DST change.
    expect(new Date(2026, 2, 30).getTimezoneOffset()).not.toBe(new Date(2026, 2, 28).getTimezoneOffset())
    const { days } = winStats([], Date.now())
    expect(days.map((day) => new Date(day.start).getDate())).toEqual([27, 28, 29, 30, 31, 1, 2])
    expect(days.every((day) => new Date(day.start).getHours() === 0)).toBe(true)
  })

  it('a Win late on the day before the change stays on that day', () => {
    const lateSaturday = new Date(2026, 2, 28, 23, 30).getTime()
    const { days } = winStats([event('item', lateSaturday)], Date.now())
    expect(days.map((day) => day.count)).toEqual([0, 1, 0, 0, 0, 0, 0])
    expect(daysAgo(lateSaturday, Date.now())).toBe(5)
  })
})

describe('daysAgo', () => {
  it('counts calendar days, not 24-hour spans', () => {
    const lateTonight = new Date(2026, 9, 14, 23, 50).getTime()
    expect(daysAgo(new Date(2026, 9, 14, 0, 10).getTime(), lateTonight)).toBe(0)
    expect(daysAgo(new Date(2026, 9, 13, 23, 59).getTime(), new Date(2026, 9, 14, 0, 1).getTime())).toBe(1)
    expect(daysAgo(new Date(2026, 9, 9, 12).getTime(), lateTonight)).toBe(5)
  })
})

describe('eventsOfArea', () => {
  const cards = [makeCard({ id: 'c1', areaId: 'a2' }), makeCard({ id: 'c2', areaId: 'a1' })]
  const events: WinEvent[] = [
    // Checked while c1 was in Trabajo, then c1 moved to Vida.
    { id: 'e1', type: 'item', at: 1, cardId: 'c1', itemId: 'i1', areaId: 'a1' },
    { id: 'e2', type: 'item', at: 2, cardId: 'c1', itemId: 'i2', areaId: 'a1' },
    { id: 'e3', type: 'card', at: 3, cardId: 'c2', areaId: 'a1' },
    // Imported, its Card is gone.
    { id: 'e4', type: 'note', at: 4, cardId: 'gone', areaId: 'a3' },
  ]

  it("counts an event in its Card's current Area, not its snapshot", () => {
    expect(eventsOfArea(events, cards, 'a2').map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(eventsOfArea(events, cards, 'a1').map((e) => e.id)).toEqual(['e3'])
  })

  it('falls back to the snapshot for an event whose Card is gone', () => {
    expect(eventsOfArea(events, cards, 'a3').map((e) => e.id)).toEqual(['e4'])
  })

  it('the Areas add up to every event', () => {
    const now = Date.now()
    const perArea = ['a1', 'a2', 'a3'].map((id) => winStats(eventsOfArea(events, cards, id), now).total)
    expect(perArea.reduce((sum, n) => sum + n, 0)).toBe(winStats(events, now).total)
  })
})
