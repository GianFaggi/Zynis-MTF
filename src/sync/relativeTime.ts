import type { Language } from '../types'

// "hace 5 minutos" / "5 minutes ago" for the Account's last sync (#37), with the browser's own
// wording through Intl.RelativeTimeFormat. Pure.

const STEPS: { unit: Intl.RelativeTimeFormatUnit; ms: number; below: number }[] = [
  { unit: 'second', ms: 1000, below: 45 },
  { unit: 'minute', ms: 60_000, below: 60 },
  { unit: 'hour', ms: 3_600_000, below: 24 },
  { unit: 'day', ms: 86_400_000, below: 30 },
  { unit: 'month', ms: 30 * 86_400_000, below: 12 },
  { unit: 'year', ms: 365 * 86_400_000, below: Infinity },
]

/** How long ago `time` was, in the current language. Under 45 seconds is "now" ("ahora"). */
export function relativeTime(time: number, now: number, language: Language): string {
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  const elapsed = Math.max(0, now - time)
  if (elapsed < STEPS[0].below * 1000) return format.format(0, 'second')
  for (const step of STEPS.slice(1)) {
    const amount = Math.round(elapsed / step.ms)
    if (amount < step.below) return format.format(-amount, step.unit)
  }
  return format.format(-Math.round(elapsed / STEPS.at(-1)!.ms), 'year')
}
