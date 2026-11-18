import { useEffect, useState } from 'react'

/** The current time, taken on mount and refreshed every `everyMs`, so "hace 5 minutos" stays true while shown. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}
