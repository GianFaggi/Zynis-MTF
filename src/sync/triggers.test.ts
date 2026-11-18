import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialAccountState, useAccountStore } from '../account/accountStore'
import { wakeApi } from '../account/api'
import { leave, pushPending, syncNow } from './engine'
import { initialSyncUiState, useSyncStore } from './syncStore'
import { IDLE_AFTER, KEEP_AWAKE_EVERY, startSyncTriggers } from './triggers'

vi.mock('./engine', () => ({
  initSync: vi.fn(),
  leave: vi.fn(async () => {}),
  pushPending: vi.fn(async () => {}),
  syncNow: vi.fn(async () => {}),
}))
vi.mock('../account/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../account/api')>()),
  wakeApi: vi.fn(async () => true),
}))

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(value: DocumentVisibilityState) {
  visibility = value
  document.dispatchEvent(new Event('visibilitychange'))
}

const signIn = () => useAccountStore.setState({ email: 'ana@example.com' })
const setPending = (pendingCount: number) => useSyncStore.setState({ pendingCount })
const input = () => window.dispatchEvent(new Event('pointerdown'))

describe('sync triggers', () => {
  let stop: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
    useAccountStore.setState(initialAccountState(), true)
    useSyncStore.setState(initialSyncUiState(), true)
    vi.mocked(syncNow).mockClear()
    vi.mocked(leave).mockClear()
    vi.mocked(pushPending).mockClear()
    vi.mocked(wakeApi).mockClear()
  })

  afterEach(() => {
    stop?.()
    vi.useRealTimers()
  })

  it('arrives after the first render, not before', async () => {
    signIn()
    stop = startSyncTriggers()
    expect(syncNow).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(0)
    expect(syncNow).toHaveBeenCalledTimes(1)
  })

  it('does nothing at launch with no session', async () => {
    stop = startSyncTriggers()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(syncNow).not.toHaveBeenCalled()
    expect(wakeApi).not.toHaveBeenCalled()
  })

  it('leaves when hidden and arrives when visible again', async () => {
    signIn()
    stop = startSyncTriggers()
    await vi.advanceTimersByTimeAsync(0)

    setVisibility('hidden')
    expect(leave).toHaveBeenCalledWith()

    setVisibility('visible')
    expect(syncNow).toHaveBeenCalledTimes(2)
  })

  it('sends with no time to renew when the page closes', () => {
    signIn()
    stop = startSyncTriggers()
    window.dispatchEvent(new Event('pagehide'))
    expect(leave).toHaveBeenCalledWith({ closing: true })
  })

  it('sends what is pending when the connection comes back', () => {
    signIn()
    stop = startSyncTriggers()
    window.dispatchEvent(new Event('online'))
    expect(pushPending).toHaveBeenCalled()
  })

  it('counts 2.5 minutes with no input as leaving, and the next input as arriving', async () => {
    signIn()
    stop = startSyncTriggers()
    await vi.advanceTimersByTimeAsync(0)
    setPending(2)

    await vi.advanceTimersByTimeAsync(IDLE_AFTER - 1000)
    input()
    await vi.advanceTimersByTimeAsync(IDLE_AFTER - 1000)
    expect(leave).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(leave).toHaveBeenCalledTimes(1)
    setPending(0)

    input()
    expect(syncNow).toHaveBeenCalledTimes(2)
  })

  it('makes no request in an hour with nothing pending', async () => {
    signIn()
    stop = startSyncTriggers()
    await vi.advanceTimersByTimeAsync(0)
    vi.mocked(syncNow).mockClear()

    for (let minute = 0; minute < 60; minute++) {
      input()
      await vi.advanceTimersByTimeAsync(60_000)
    }

    expect(syncNow).not.toHaveBeenCalled()
    expect(leave).not.toHaveBeenCalled()
    expect(wakeApi).not.toHaveBeenCalled()
  })

  it('wakes the server at most once every 10 minutes during 40 minutes of edits', async () => {
    signIn()
    stop = startSyncTriggers()
    await vi.advanceTimersByTimeAsync(0)
    setPending(1)

    for (let second = 0; second < 40 * 60; second += 20) {
      input()
      await vi.advanceTimersByTimeAsync(20_000)
    }

    expect(vi.mocked(wakeApi).mock.calls.length).toBeLessThanOrEqual((40 * 60 * 1000) / KEEP_AWAKE_EVERY)
    expect(wakeApi).toHaveBeenCalled()
    expect(leave).not.toHaveBeenCalled()
  })

  it('stops the keep-awake once nothing is pending or MTF is hidden', async () => {
    signIn()
    stop = startSyncTriggers()
    await vi.advanceTimersByTimeAsync(0)
    setPending(1)
    setVisibility('hidden')

    await vi.advanceTimersByTimeAsync(3 * KEEP_AWAKE_EVERY)
    expect(wakeApi).not.toHaveBeenCalled()
  })
})
