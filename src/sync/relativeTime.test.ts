import { describe, expect, it } from 'vitest'
import { relativeTime } from './relativeTime'

const now = Date.UTC(2026, 10, 18, 12, 0, 0)
const minutes = (n: number) => now - n * 60_000

describe('relativeTime', () => {
  it('says now for under 45 seconds', () => {
    expect(relativeTime(now - 10_000, now, 'es')).toBe('ahora')
    expect(relativeTime(now - 10_000, now, 'en')).toBe('now')
  })

  it('counts minutes, hours and days in the current language', () => {
    expect(relativeTime(minutes(5), now, 'es')).toBe('hace 5 minutos')
    expect(relativeTime(minutes(5), now, 'en')).toBe('5 minutes ago')
    expect(relativeTime(minutes(180), now, 'es')).toBe('hace 3 horas')
    expect(relativeTime(minutes(60 * 24), now, 'es')).toBe('ayer')
    expect(relativeTime(minutes(60 * 24 * 4), now, 'en')).toBe('4 days ago')
  })

  it('never says a time in the future', () => {
    expect(relativeTime(now + 60_000, now, 'es')).toBe('ahora')
  })
})
