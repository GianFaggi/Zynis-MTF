import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANGUAGE_KEY } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { WAIT_LIMIT } from '../sync/wait'
import { resetStores } from '../test/stores'
import { API_URL, WAKE_RETRY, resetWake } from './api'
import { GoogleWait } from './GoogleWait'

const LOGIN = `${API_URL}/api/auth/google/login?handoff=the-hash&lang=es`

/** `/health` fails ("not yet", as while Render spins up) until `wake()` is called. */
function stubHealth() {
  let awake = false
  const fetchMock = vi.fn(async () => {
    if (!awake) throw new TypeError('Failed to fetch')
    return new Response('Healthy', { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, wake: () => (awake = true) }
}

/** jsdom's `location.replace` cannot be spied on directly, so the whole `location` is stubbed. */
function stubReplace() {
  const replace = vi.fn()
  vi.stubGlobal('location', { ...window.location, replace })
  return replace
}

// The plane schedules its next message when it renders, and a test renders only when an `act`
// ends, so time moves in small steps, each in its own `act` (as in PlaneWait.test.tsx).
const STEP = 500
async function wait(ms: number) {
  for (let done = 0; done < ms; done += STEP) await act(() => vi.advanceTimersByTimeAsync(Math.min(STEP, ms - done)))
  if (ms === 0) await act(() => vi.advanceTimersByTimeAsync(0))
}

describe('GoogleWait', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStores()
    resetWake()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('goes on to Google with replace, at once, when the API is awake', async () => {
    const { wake } = stubHealth()
    wake()
    const replace = stubReplace()

    render(<GoogleWait hash="the-hash" />)
    await wait(0)

    expect(replace).toHaveBeenCalledExactlyOnceWith(LOGIN)
    expect(screen.getByRole('status')).toHaveTextContent('Entrando…')
  })

  it('shows the plane and does not go on before /health answers, then goes on by itself', async () => {
    const { fetchMock, wake } = stubHealth()
    const replace = stubReplace()

    const { container } = render(<GoogleWait hash="the-hash" />)
    await wait(WAKE_RETRY)

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/health`, expect.anything())
    expect(replace).not.toHaveBeenCalled()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Conectando…')

    wake()
    await wait(WAKE_RETRY)
    expect(replace).toHaveBeenCalledExactlyOnceWith(LOGIN)
  })

  it('stays on the calm message and does not go on once the wait gives up', async () => {
    stubHealth()
    const replace = stubReplace()

    render(<GoogleWait hash="the-hash" />)
    await wait(WAIT_LIMIT + WAKE_RETRY)

    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('No pudimos conectar ahora.')
  })

  it('speaks the language it was given and saves none', async () => {
    const { wake } = stubHealth()
    wake()
    const replace = stubReplace()
    useAppStore.setState({ language: 'en' })

    render(<GoogleWait hash="the-hash" />)
    await wait(0)

    expect(screen.getByRole('status')).toHaveTextContent('Signing in…')
    expect(document.documentElement.lang).toBe('en')
    expect(replace).toHaveBeenCalledExactlyOnceWith(`${API_URL}/api/auth/google/login?handoff=the-hash&lang=en`)
    expect(localStorage.getItem(LANGUAGE_KEY)).toBeNull()
  })
})
