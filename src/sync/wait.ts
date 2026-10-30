// How a wait for the server goes on (openspec/specs/server-wait). The stage is a pure
// function of the time since the wait started, so a background tab whose timers were
// throttled jumps straight to the right message when it comes back.

export type WaitStage = 'entering' | 'connecting' | 'waking' | 'almost' | 'failed'

/** Each stage and the time (ms since the wait started) it begins at, in order. */
export const WAIT_STEPS: readonly { stage: WaitStage; at: number }[] = [
  { stage: 'entering', at: 0 },
  { stage: 'connecting', at: 1_500 },
  { stage: 'waking', at: 8_000 },
  { stage: 'almost', at: 30_000 },
  { stage: 'failed', at: 90_000 },
]

/** The sync indicator shows only once a wait has lasted this long (ms). */
export const INDICATOR_DELAY = 2_000

/** The last stage reached after `elapsedMs`. */
export function waitStage(elapsedMs: number): WaitStage {
  return WAIT_STEPS.findLast((step) => elapsedMs >= step.at)?.stage ?? 'entering'
}

/** When the next stage begins (ms since the wait started), or `null` once the wait gave up. */
export function nextStepAt(elapsedMs: number): number | null {
  return WAIT_STEPS.find((step) => step.at > elapsedMs)?.at ?? null
}
