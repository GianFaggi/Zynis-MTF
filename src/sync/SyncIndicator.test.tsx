import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { SyncIndicator } from './SyncIndicator'

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('SyncIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStores()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows nothing for the first 2 s, then a swaying plane named "Sincronizando…"', () => {
    const { container } = render(<SyncIndicator />)
    wait(1_999)
    expect(container).toBeEmptyDOMElement()
    wait(1)
    const indicator = screen.getByRole('img', { name: 'Sincronizando…' })
    expect(indicator.querySelector('.animate-sway')).not.toBeNull()
  })

  it('speaks English', () => {
    useAppStore.setState({ language: 'en' })
    render(<SyncIndicator />)
    wait(2_000)
    expect(screen.getByRole('img', { name: 'Syncing…' })).toBeInTheDocument()
  })

  it('never appears when the sync ends within 1.5 s, and leaves no timer behind', () => {
    const { container, unmount } = render(<SyncIndicator />)
    wait(1_500)
    expect(container).toBeEmptyDOMElement()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('is ink, never the accent', () => {
    const { container } = render(<SyncIndicator />)
    wait(2_000)
    expect(container.innerHTML).toMatch(/text-ink-2/)
    expect(container.innerHTML).not.toMatch(/accent/)
  })
})
