import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSession, saveSession, SESSION_KEY } from '../lib/storage'
import { apiRequest, type ApiResult } from './api'
import {
  initialAccountState,
  loadMe,
  refreshSession,
  signedIn,
  signOut,
  useAccountStore,
  type Tokens,
} from './accountStore'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  apiRequest: vi.fn(),
}))

const request = vi.mocked(apiRequest)

const tokens = (refreshToken: string, accessToken = `jwt-for-${refreshToken}`): Tokens => ({
  accessToken,
  accessTokenExpiresAt: '2026-11-02T12:15:00Z',
  refreshToken,
  email: 'gian@example.com',
})

/** The renewal token each call to /refresh sent. */
const sentRefreshTokens = () =>
  request.mock.calls
    .filter(([path]) => path === '/api/auth/refresh')
    .map(([, options]) => (options?.body as { refreshToken: string }).refreshToken)

function answer(...results: ApiResult<unknown>[]) {
  for (const result of results) request.mockResolvedValueOnce(result)
}

describe('accountStore', () => {
  beforeEach(() => {
    request.mockReset()
    useAccountStore.setState(initialAccountState(), true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with the email of the session on this device, and no access token', () => {
    saveSession({ refreshToken: 'rt-1', email: 'gian@example.com' })

    useAccountStore.setState(initialAccountState(), true)

    expect(useAccountStore.getState()).toMatchObject({ email: 'gian@example.com', accessToken: null })
  })

  it('makes no request when it starts, signed in or not', () => {
    saveSession({ refreshToken: 'rt-1', email: 'gian@example.com' })

    useAccountStore.setState(initialAccountState(), true)

    expect(request).not.toHaveBeenCalled()
  })

  it('a sign-in keeps the renewal token on the device and the access token in memory', () => {
    signedIn(tokens('rt-1'))

    expect(loadSession()).toEqual({ refreshToken: 'rt-1', email: 'gian@example.com' })
    expect(localStorage.getItem(SESSION_KEY)).not.toContain('jwt-for')
    expect(useAccountStore.getState()).toMatchObject({ email: 'gian@example.com', accessToken: 'jwt-for-rt-1' })
  })

  it('a renewal saves the new token on the device before using it', async () => {
    signedIn(tokens('rt-1'))
    answer({ ok: true, data: tokens('rt-2') })

    const result = await refreshSession()

    expect(result).toEqual({ ok: true, data: 'jwt-for-rt-2' })
    expect(loadSession()?.refreshToken).toBe('rt-2')
    expect(useAccountStore.getState().accessToken).toBe('jwt-for-rt-2')
  })

  it('reads the renewal token from the device at each use, so another tab’s renewal is followed', async () => {
    signedIn(tokens('rt-1'))
    saveSession({ refreshToken: 'rt-from-other-tab', email: 'gian@example.com' })
    answer({ ok: true, data: tokens('rt-3') })

    await refreshSession()

    expect(sentRefreshTokens()).toEqual(['rt-from-other-tab'])
  })

  it('only session_ended ends the session, quietly', async () => {
    signedIn(tokens('rt-1'))
    answer({ ok: false, code: 'session_ended', status: 401 })

    await refreshSession()

    expect(loadSession()).toBeNull()
    expect(useAccountStore.getState()).toMatchObject({ email: null, accessToken: null, sessionEnded: true })
  })

  it.each<[string, ApiResult<unknown>]>([
    ['a network failure', { ok: false, code: 'network' }],
    ['a timeout', { ok: false, code: 'timeout' }],
    ['no connection', { ok: false, code: 'offline' }],
    ['too many requests', { ok: false, code: 'too_many_requests', status: 429 }],
    ['a server error', { ok: false, code: 'server_error', status: 500 }],
  ])('%s keeps the session for next time', async (_, failure) => {
    signedIn(tokens('rt-1'))
    answer(failure)

    await refreshSession()

    expect(loadSession()).toEqual({ refreshToken: 'rt-1', email: 'gian@example.com' })
    expect(useAccountStore.getState()).toMatchObject({ email: 'gian@example.com', sessionEnded: false })
  })

  it('signing out forgets the session at once and tells the server', () => {
    signedIn(tokens('rt-1'))
    answer({ ok: true, data: undefined })

    signOut()

    expect(loadSession()).toBeNull()
    expect(useAccountStore.getState()).toMatchObject({ email: null, accessToken: null, sessionEnded: false })
    expect(request).toHaveBeenCalledWith('/api/auth/logout', { body: { refreshToken: 'rt-1' } })
  })

  it('signing out with no connection forgets the session and sends nothing', () => {
    signedIn(tokens('rt-1'))
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    expect(() => signOut()).not.toThrow()

    expect(loadSession()).toBeNull()
    expect(useAccountStore.getState().email).toBeNull()
    expect(request).not.toHaveBeenCalled()
  })

  it('with storage refused, a sign-in still holds for this launch, and renews from memory', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError')
      })
    }

    expect(() => signedIn(tokens('rt-1'))).not.toThrow()
    expect(useAccountStore.getState().email).toBe('gian@example.com')

    answer({ ok: true, data: tokens('rt-2') })
    await refreshSession()
    expect(sentRefreshTokens()).toEqual(['rt-1'])
  })

  it('who is signed in: renews first when there is no access token', async () => {
    saveSession({ refreshToken: 'rt-1', email: 'gian@example.com' })
    useAccountStore.setState(initialAccountState(), true)
    const me = { email: 'gian@example.com', hasPassword: true, hasGoogle: false }
    answer({ ok: true, data: tokens('rt-2') }, { ok: true, data: me })

    expect(await loadMe()).toEqual({ ok: true, data: me })
    expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/auth/refresh', '/api/auth/me'])
    expect(request.mock.calls[1][1]).toMatchObject({ method: 'GET', accessToken: 'jwt-for-rt-2' })
  })
})
