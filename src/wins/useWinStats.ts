import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { winStats, type WinStats } from './stats'

/**
 * The current time, taken once and refreshed at each local midnight. The 7-day
 * numbers only depend on the date, so a screen left open overnight moves on to the
 * new week without re-rendering every minute.
 */
function useToday(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const today = new Date(now)
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime()
    const timer = setTimeout(() => setNow(Date.now()), tomorrow - Date.now())
    return () => clearTimeout(timer)
  }, [now])
  return now
}

/** `winStats` over the stored events, for today. */
export function useWinStats(): WinStats & { now: number } {
  const events = useAppStore((state) => state.data.events)
  const now = useToday()
  return useMemo(() => ({ ...winStats(events, now), now }), [events, now])
}
