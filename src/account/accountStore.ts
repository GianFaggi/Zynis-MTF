import { create } from 'zustand'
import { clearSession, loadSession, saveSession } from '../lib/storage'
import type { StoredSession } from '../types'
import { apiRequest, withSession, type ApiResult, type SessionAccess } from './api'

// The account on this device (openspec/specs/account-session, ADR 0010). The renewal token lives
// in `mtf_session` and is read at each use, never cached, so tabs share one session; the access
// token lives only here, in memory. Nothing in this module runs at launch, and only a
// `session_ended` answer from the server ends a session: never a clock, a failure or a timeout.

/** What the API answers on a sign-in or a renewal. */
export interface Tokens {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  email: string
}

export interface Me {
  email: string
  hasPassword: boolean
  hasGoogle: boolean
}

/** A mail link the app was opened with (`#verify=` or `#reset=`), read by `readAccountLink()`. */
export interface AccountLink {
  kind: 'verify' | 'reset'
  token: string
}

export interface AccountState {
  /** The signed-in account's email, shown with no connection; `null` when signed out. */
  email: string | null
  accessToken: string | null
  sheetOpen: boolean
  link: AccountLink | null
  /** Goes up with every mail link, so a link arriving while the sheet is open restarts it on its step. */
  linkCount: number
  /** The server ended the session: the sheet invites to sign in again, quietly. */
  sessionEnded: boolean
  /** The session kept in memory too, for a launch where the browser refuses storage. */
  memorySession: StoredSession | null
}

export function initialAccountState(): AccountState {
  const stored = loadSession()
  return {
    email: stored?.email ?? null,
    accessToken: null,
    sheetOpen: false,
    link: null,
    linkCount: 0,
    sessionEnded: false,
    memorySession: stored,
  }
}

export const useAccountStore = create<AccountState>()(initialAccountState)

export function openAccount(): void {
  useAccountStore.setState({ sheetOpen: true })
}

/** Closing drops a mail link that was not used, so its token does not linger in memory. */
export function closeAccount(): void {
  useAccountStore.setState({ sheetOpen: false, link: null })
}

/** Opens the sheet on the link's step. */
export function openWithLink(link: AccountLink): void {
  useAccountStore.setState((state) => ({ link, sheetOpen: true, linkCount: state.linkCount + 1 }))
}

export function clearLink(): void {
  useAccountStore.setState({ link: null })
}

/** Keeps a new session: saved on the device first, so a renewal token is never used before it is stored. */
export function signedIn(tokens: Tokens): void {
  const session = { refreshToken: tokens.refreshToken, email: tokens.email }
  saveSession(session)
  useAccountStore.setState({ email: tokens.email, accessToken: tokens.accessToken, sessionEnded: false, memorySession: session })
}

/**
 * Forgets the session at once, with or without a connection, and tells the server when it can.
 * The Desk is untouched, and a failure is never shown.
 */
export function signOut(): void {
  const session = currentSession()
  forget({ sessionEnded: false })
  if (session && navigator.onLine) void apiRequest('/api/auth/logout', { body: { refreshToken: session.refreshToken } })
}

/**
 * Renews the access token. Only `session_ended` ends the session; any other failure keeps it for next time.
 * One renewal at a time across this browser's tabs, each reading the token the last one saved: two
 * renewals racing with the same token would leave two live tokens, and the older one, kept on the
 * device, would end the session at its next use.
 */
export function refreshSession(signal?: AbortSignal): Promise<ApiResult<string>> {
  return oneAtATime(async () => {
    const session = currentSession()
    if (!session) {
      // Another tab signed out: nothing left to renew.
      forget({ sessionEnded: false })
      return { ok: false, code: 'session_ended' }
    }
    const result = await apiRequest<Tokens>('/api/auth/refresh', { body: { refreshToken: session.refreshToken }, signal })
    if (result.ok) {
      signedIn(result.data)
      return { ok: true, data: result.data.accessToken }
    }
    if (result.code === 'session_ended') forget({ sessionEnded: true })
    return result
  })
}

const RENEWAL_LOCK = 'mtf_session_renewal'

/** Runs `task` under a lock shared by this origin's tabs (Web Locks); a browser without them runs it at once. */
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  return 'locks' in navigator ? navigator.locks.request(RENEWAL_LOCK, task) : task()
}

export function sessionAccess(signal?: AbortSignal): SessionAccess {
  return { accessToken: () => useAccountStore.getState().accessToken, refresh: () => refreshSession(signal) }
}

/** Who is signed in, renewing the access token first when needed. Called when the Account sheet opens. */
export function loadMe(signal?: AbortSignal): Promise<ApiResult<Me>> {
  return withSession(sessionAccess(signal), (accessToken) =>
    apiRequest<Me>('/api/auth/me', { method: 'GET', accessToken, signal }),
  )
}

/** Read from the device at each use; the memory copy only when storage refuses. */
function currentSession(): StoredSession | null {
  return loadSession() ?? useAccountStore.getState().memorySession
}

function forget({ sessionEnded }: { sessionEnded: boolean }): void {
  clearSession()
  useAccountStore.setState({ email: null, accessToken: null, memorySession: null, sessionEnded })
}
