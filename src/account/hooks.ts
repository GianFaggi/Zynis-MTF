import { useEffect, useState, useSyncExternalStore } from 'react'

/** Whether the browser says it has a connection, kept up to date. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine)
}

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * A countdown in whole seconds, ticking once a second: `[secondsLeft, start(ms)]`. The clock
 * starts in `start`, called from an event, so the first second shown is the full wait.
 */
export function useCountdown(): [number, (ms: number) => void] {
  const [clock, setClock] = useState<{ until: number; now: number } | null>(null)
  const until = clock?.until

  useEffect(() => {
    if (until === undefined) return
    const timer = setInterval(
      () => setClock((current) => (!current || current.now >= current.until ? current : { ...current, now: Date.now() })),
      1000,
    )
    return () => clearInterval(timer)
  }, [until])

  const start = (ms: number) => {
    const now = Date.now()
    setClock({ until: now + ms, now })
  }
  return [clock ? Math.max(0, Math.ceil((clock.until - clock.now) / 1000)) : 0, start]
}
