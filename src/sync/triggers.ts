import { useAccountStore } from '../account/accountStore'
import { wakeApi } from '../account/api'
import { initSync, leave, pushPending, syncNow } from './engine'
import { useSyncStore } from './syncStore'

// When sync runs (#37, design D6). Arriving: launch, MTF visible again, the first input after idle.
// Leaving: hidden, closing, 2.5 minutes with no input. Back online: send. No polling: the only timers
// are the idle one and the keep-awake, both running only while something waits to be sent, and
// neither reads data. Nothing fires with no session.

/** No pointer, touch, key or wheel for this long while visible counts as leaving. */
export const IDLE_AFTER = 150_000
/** While something waits to be sent and MTF is visible, Render is kept awake this often (`/health`). */
export const KEEP_AWAKE_EVERY = 10 * 60 * 1000

const INPUTS = ['pointerdown', 'keydown', 'wheel'] as const

/**
 * Starts sync and its triggers; returns a function that stops them. The launch sync runs after the
 * first render (a macrotask after the caller mounts React), never before it.
 */
export function startSyncTriggers(): () => void {
  initSync()
  let idle = false
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  let keepAwake: ReturnType<typeof setInterval> | undefined

  const signedIn = () => useAccountStore.getState().email !== null
  const pending = () => useSyncStore.getState().pendingCount > 0
  const visible = () => document.visibilityState === 'visible'

  const arrive = () => {
    idle = false
    if (signedIn()) void syncNow()
  }

  /** The idle timer and the keep-awake run only while something waits, MTF is visible and signed in. */
  const schedule = () => {
    const active = pending() && visible() && signedIn()
    clearTimeout(idleTimer)
    idleTimer = undefined
    if (active && !idle) {
      idleTimer = setTimeout(() => {
        idle = true
        void leave()
      }, IDLE_AFTER)
    }
    if (active && keepAwake === undefined) keepAwake = setInterval(() => void wakeApi(), KEEP_AWAKE_EVERY)
    if (!active && keepAwake !== undefined) {
      clearInterval(keepAwake)
      keepAwake = undefined
    }
  }

  const onInput = () => {
    if (idle) arrive()
    if (pending()) schedule()
  }
  const onVisibility = () => {
    if (visible()) arrive()
    else void leave()
    schedule()
  }
  const onPageHide = () => void leave({ closing: true })
  const onOnline = () => void pushPending()

  for (const input of INPUTS) window.addEventListener(input, onInput, { capture: true, passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('online', onOnline)
  const stopWatching = [
    useSyncStore.subscribe((current, previous) => {
      if ((current.pendingCount > 0) !== (previous.pendingCount > 0)) schedule()
    }),
    useAccountStore.subscribe((current, previous) => {
      if (current.email !== previous.email) schedule()
    }),
  ]
  const launch = setTimeout(() => {
    if (visible()) arrive()
    schedule()
  }, 0)

  return () => {
    clearTimeout(launch)
    clearTimeout(idleTimer)
    clearInterval(keepAwake)
    for (const input of INPUTS) window.removeEventListener(input, onInput, { capture: true })
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('online', onOnline)
    for (const stop of stopWatching) stop()
  }
}
