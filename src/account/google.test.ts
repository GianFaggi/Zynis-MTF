import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_URL, apiRequest, type ApiResult } from './api'
import type { Tokens } from './accountStore'
import {
  GOOGLE_LIMIT,
  POLL_EVERY,
  googleLoginUrl,
  googleWaitUrl,
  hashSecret,
  newHandoff,
  openGoogleWindow,
  pollOutcome,
  readGoogleWait,
  useGoogleWatch,
  watchGoogle,
} from './google'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  apiRequest: vi.fn(),
}))

const request = vi.mocked(apiRequest)
const tokens: Tokens = { accessToken: 'jwt', accessTokenExpiresAt: '2026-11-02T12:15:00Z', refreshToken: 'rt', email: 'gian@example.com' }
const handoff = { secret: 'the-secret', hash: 'the-hash' }
const pending: ApiResult<Tokens | undefined> = { ok: true, data: undefined }

function setVisibility(state: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('newHandoff', () => {
  it('makes a 256-bit secret and its SHA-256, both base64url, as the API computes them', async () => {
    const { secret, hash } = await newHandoff()

    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(hash).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(hash).toBe(await hashSecret(secret))
    expect((await newHandoff()).secret).not.toBe(secret)
  })
})

describe('hashSecret', () => {
  it('is SHA-256 in base64url with no padding, the same vector the API tests', async () => {
    expect(await hashSecret('abc')).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0')
  })
})

describe('the window', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("goes on to the API's Google login with only the hash and the language", () => {
    expect(googleLoginUrl('the-hash', 'en')).toBe(`${API_URL}/api/auth/google/login?handoff=the-hash&lang=en`)
  })

  it("waits on MTF's own address, with the hash in the fragment and never the secret", () => {
    const url = googleWaitUrl('the-hash', 'en')

    expect(url).toBe(`${location.origin}/#google=the-hash&lang=en`)
    expect(url).not.toContain(API_URL)
    expect(url).not.toContain('the-secret')
  })

  it("opens synchronously, inside the click, on MTF's wait", () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)

    openGoogleWindow(handoff, 'es')

    // No await before this line: the window was opened in the same task as the click.
    expect(open).toHaveBeenCalledWith(`${location.origin}/#google=the-hash&lang=es`, '_blank')
    expect(String(open.mock.calls[0][0])).not.toContain('the-secret')
  })
})

describe('readGoogleWait', () => {
  it('reads the hash and the language that googleWaitUrl wrote', () => {
    expect(readGoogleWait(new URL(googleWaitUrl('a-B_9', 'en')).hash)).toEqual({ hash: 'a-B_9', language: 'en' })
  })

  it('keeps the window’s own language when the address carries none it knows', () => {
    expect(readGoogleWait('#google=the-hash')).toEqual({ hash: 'the-hash' })
    expect(readGoogleWait('#google=the-hash&lang=fr')).toEqual({ hash: 'the-hash' })
  })

  it.each(['', '#', '#verify=token', '#google=', '#google=no spaces&lang=es'])(
    'is not a Google wait: %j',
    (fragment) => {
      expect(readGoogleWait(fragment)).toBeNull()
    },
  )
})

describe('pollOutcome', () => {
  it('waits on 202', () => {
    expect(pollOutcome(pending, 10_000)).toEqual({ kind: 'wait' })
  })

  it('ends with the tokens', () => {
    expect(pollOutcome({ ok: true, data: tokens }, 10_000)).toEqual({ kind: 'done', tokens })
  })

  it('ends when Google failed', () => {
    expect(pollOutcome({ ok: false, code: 'google_failed', status: 410 }, 10_000)).toEqual({ kind: 'failed', code: 'google_failed' })
  })

  it.each(['network', 'timeout', 'offline', 'too_many_requests', 'server_error'])('keeps waiting after a passing %s', (code) => {
    expect(pollOutcome({ ok: false, code }, 10_000)).toEqual({ kind: 'wait' })
  })

  it('gives up after 5 minutes', () => {
    expect(pollOutcome(pending, GOOGLE_LIMIT)).toEqual({ kind: 'failed', code: 'google_timeout' })
  })
})

describe('watchGoogle', () => {
  const watchers: (() => void)[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    request.mockReset()
    request.mockResolvedValue(pending)
  })

  afterEach(() => {
    watchers.splice(0).forEach((stop) => stop())
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const watch = () => {
    const onDone = vi.fn()
    const onFailed = vi.fn()
    const stop = watchGoogle(handoff, { onDone, onFailed })
    watchers.push(stop)
    return { onDone, onFailed, stop }
  }

  it('asks every 3 seconds, sending the secret only in the POST body', async () => {
    watch()

    await vi.advanceTimersByTimeAsync(POLL_EVERY - 1)
    expect(request).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(request).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(POLL_EVERY)
    expect(request).toHaveBeenCalledTimes(2)

    expect(request.mock.calls[0][0]).toBe('/api/auth/google/exchange')
    expect(request.mock.calls[0][1]).toMatchObject({ body: { secret: 'the-secret' } })
  })

  it('asks at once when the user comes back to MTF', async () => {
    watch()

    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not ask on leaving MTF', async () => {
    watch()

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(0)

    expect(request).not.toHaveBeenCalled()
  })

  it('stops on the tokens and hands them over', async () => {
    request.mockResolvedValueOnce({ ok: true, data: tokens })
    const { onDone } = watch()

    await vi.advanceTimersByTimeAsync(POLL_EVERY * 3)

    expect(onDone).toHaveBeenCalledWith(tokens)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('stops when Google failed', async () => {
    request.mockResolvedValueOnce({ ok: false, code: 'google_failed', status: 410 })
    const { onFailed } = watch()

    await vi.advanceTimersByTimeAsync(POLL_EVERY * 3)

    expect(onFailed).toHaveBeenCalledWith('google_failed')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('stops after 5 minutes with nobody finishing', async () => {
    const { onFailed, onDone } = watch()

    await vi.advanceTimersByTimeAsync(GOOGLE_LIMIT)
    const asked = request.mock.calls.length
    await vi.advanceTimersByTimeAsync(POLL_EVERY * 5)

    expect(onFailed).toHaveBeenCalledWith('google_timeout')
    expect(onDone).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledTimes(asked)
  })

  it('stops on cancel or when the sheet closes, aborting what is in flight', async () => {
    const { stop, onDone, onFailed } = watch()
    await vi.advanceTimersByTimeAsync(POLL_EVERY)
    const signal = request.mock.calls[0][1]!.signal!

    stop()
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(POLL_EVERY * 5)

    expect(signal.aborted).toBe(true)
    expect(request).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
    expect(onFailed).not.toHaveBeenCalled()
  })
})

describe('useGoogleWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    request.mockReset()
    request.mockResolvedValue(pending)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops asking when the sheet unmounts', async () => {
    const { unmount } = renderHook(() => useGoogleWatch(handoff, { onDone: vi.fn(), onFailed: vi.fn() }))
    await vi.advanceTimersByTimeAsync(POLL_EVERY)
    expect(request).toHaveBeenCalledTimes(1)

    unmount()
    await vi.advanceTimersByTimeAsync(POLL_EVERY * 5)

    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not ask without a hand-off', async () => {
    renderHook(() => useGoogleWatch(null, { onDone: vi.fn(), onFailed: vi.fn() }))

    await vi.advanceTimersByTimeAsync(POLL_EVERY * 5)

    expect(request).not.toHaveBeenCalled()
  })
})
