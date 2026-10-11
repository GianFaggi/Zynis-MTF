import type { WinEvent } from '../types'

// The numbers Mis logros, the wins counter and the Jar caption show, computed from
// `events` (KB/frontend/architecture.md). "Things done" are `item` + `card` events;
// notes are counted apart. Days are local calendar days, built from dates rather than
// by subtracting 24 h, so a daylight-saving change never shifts a day.

const WEEK_DAYS = 7

export interface DayCount {
  /** Local midnight that starts the day (epoch ms). */
  start: number
  count: number
}

export interface WinStats {
  /** The last 7 days, oldest first; today last. */
  days: DayCount[]
  week: { items: number; cards: number; notes: number; done: number }
  /** The day with the most things done; ties go to the most recent. `null` for a quiet week. */
  best: DayCount | null
  /** Things done since the user started. */
  total: number
}

/** Local midnight of the day `time` falls on. */
export function dayStart(time: number): number {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Calendar days from `time` to `now`: 0 today, 1 yesterday. */
export function daysAgo(time: number, now: number): number {
  const utcDate = (value: number) => {
    const date = new Date(value)
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  }
  return Math.round((utcDate(now) - utcDate(time)) / 86_400_000)
}

export function winStats(events: readonly WinEvent[], now: number): WinStats {
  const today = new Date(now)
  const dayAt = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).getTime()
  const days: DayCount[] = Array.from({ length: WEEK_DAYS }, (_, i) => ({ start: dayAt(i - (WEEK_DAYS - 1)), count: 0 }))
  const weekStart = days[0].start
  const weekEnd = dayAt(1)
  const week = { items: 0, cards: 0, notes: 0, done: 0 }
  let total = 0

  for (const event of events) {
    const inWeek = event.at >= weekStart && event.at < weekEnd
    if (event.type === 'note') {
      if (inWeek) week.notes++
      continue
    }
    total++
    if (!inWeek) continue
    if (event.type === 'item') week.items++
    else week.cards++
    days.findLast((day) => day.start <= event.at)!.count++
  }
  week.done = week.items + week.cards

  let best: DayCount | null = null
  for (const day of days) if (day.count > 0 && day.count >= (best?.count ?? 0)) best = day

  return { days, week, best, total }
}
