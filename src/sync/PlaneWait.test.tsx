import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { PlaneWait } from './PlaneWait'

const WAKING = 'El servidor se está despertando. La primera vez del día puede tardar hasta un minuto.'
const FAILED = 'No pudimos conectar ahora. Tu escritorio sigue funcionando; probá en un rato.'

// A browser renders between two timers, and the render schedules the next one; a test
// renders only when an `act` ends. So time moves in small steps, each in its own `act`.
const STEP = 100
function wait(ms: number) {
  for (let done = 0; done < ms; done += STEP) act(() => vi.advanceTimersByTime(Math.min(STEP, ms - done)))
}
const plane = (container: HTMLElement) => container.querySelector('svg')
const flying = (container: HTMLElement) => container.querySelector('.animate-fly') !== null

describe('PlaneWait', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStores()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts quietly: only "Entrando…" and no plane for the first 1.5 s', () => {
    const { container } = render(<PlaneWait />)
    expect(screen.getByRole('status')).toHaveTextContent('Entrando…')
    wait(1_400)
    expect(screen.getByRole('status')).toHaveTextContent('Entrando…')
    expect(plane(container)).toBeNull()
  })

  it('never shows the plane when the server answers within a second', () => {
    const { container, unmount } = render(<PlaneWait />)
    wait(1_000)
    expect(plane(container)).toBeNull()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('follows the timeline: the plane takes off at 1.5 s, then the waking and almost messages', () => {
    const { container } = render(<PlaneWait />)
    wait(1_500)
    expect(screen.getByRole('status')).toHaveTextContent('Conectando…')
    expect(flying(container)).toBe(true)
    wait(6_500)
    expect(screen.getByRole('status')).toHaveTextContent(WAKING)
    wait(22_000)
    expect(screen.getByRole('status')).toHaveTextContent('Ya casi…')
    expect(flying(container)).toBe(true)
  })

  it('stops the plane at 90 s with a positive message', () => {
    const { container } = render(<PlaneWait />)
    wait(90_000)
    expect(screen.getByRole('status')).toHaveTextContent(FAILED)
    expect(plane(container)).not.toBeNull()
    expect(flying(container)).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('never shows a progress bar', () => {
    render(<PlaneWait />)
    for (const ms of [0, 1_500, 6_500, 22_000, 60_000]) {
      wait(ms)
      expect(screen.queryByRole('progressbar')).toBeNull()
      expect(screen.getByRole('status')).not.toHaveTextContent(/\d/)
    }
  })

  it('announces every message in the same polite live region', () => {
    render(<PlaneWait />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    wait(8_000)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(WAKING)
  })

  it('speaks English', () => {
    useAppStore.setState({ language: 'en' })
    render(<PlaneWait />)
    expect(screen.getByRole('status')).toHaveTextContent('Signing in…')
    wait(1_500)
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…')
  })

  it('jumps straight to "Ya casi…" when a background tab held its timers for 40 s', () => {
    render(<PlaneWait />)
    // The clock moves on while the throttled timer has not fired yet; it fires late, once.
    vi.setSystemTime(Date.now() + 40_000)
    wait(1_500)
    expect(screen.getByRole('status')).toHaveTextContent('Ya casi…')
  })

  it('leaves no timer behind when it unmounts mid-wait', () => {
    const { unmount } = render(<PlaneWait />)
    wait(10_000)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
