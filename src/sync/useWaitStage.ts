import { useEffect, useState } from 'react'
import { nextStepAt, waitStage, type WaitStage } from './wait'

/**
 * The stage of a wait that started when the component mounted. The start is taken
 * once (a `useState` initializer, so StrictMode keeps it), and a single timeout wakes
 * it at the next stage; the stage is worked out from the clock, not from counted
 * delays, so a throttled background tab jumps straight to the right one.
 */
export function useWaitStage(): WaitStage {
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)
  useEffect(() => {
    const next = nextStepAt(now - start)
    if (next === null) return
    const timer = setTimeout(() => setNow(Date.now()), start + next - Date.now())
    return () => clearTimeout(timer)
  }, [start, now])
  return waitStage(now - start)
}
