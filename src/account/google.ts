import { useEffect, useRef } from 'react'
import { API_URL, apiRequest, type ApiResult } from './api'
import type { Tokens } from './accountStore'

// Google sign-in by hand-off (design decision 5, ADR 0011). MTF keeps a random secret and sends
// only its SHA-256 in the address; the session is handed over in answer to a POST holding the
// secret, wherever Google's screen ran. That is what reaches an installed iPhone app, whose
// browser windows have storage of their own.

/** Polling asks this often (ms); a return to MTF asks at once. */
export const POLL_EVERY = 3_000
/** The hand-off lives this long on the server (ms), so the app stops waiting then too. */
export const GOOGLE_LIMIT = 5 * 60 * 1000

export interface Handoff {
  /** Never in an address: only in the exchange POST's body. */
  secret: string
  /** What the address carries: SHA-256 of the secret, base64url, as the API's `SecretToken.Hash`. */
  hash: string
}

/** A new secret and its hash. Prepared before the click, because the window must open synchronously in it. */
export async function newHandoff(): Promise<Handoff> {
  const secret = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  return { secret, hash: await hashSecret(secret) }
}

/** SHA-256 of the text, base64url with no padding: exactly the API's `SecretToken.Hash`. */
export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return base64Url(new Uint8Array(digest))
}

export function googleLoginUrl(hash: string, language: string): string {
  return `${API_URL}/api/auth/google/login?handoff=${encodeURIComponent(hash)}&lang=${encodeURIComponent(language)}`
}

/**
 * Opens Google's window. Call it straight from the click handler, with no `await` before it:
 * iOS and popup blockers allow a window only from a user gesture.
 */
export function openGoogleWindow(handoff: Handoff, language: string): void {
  window.open(googleLoginUrl(handoff.hash, language), '_blank')
}

export type PollOutcome = { kind: 'wait' } | { kind: 'done'; tokens: Tokens } | { kind: 'failed'; code: string }

/**
 * What one exchange answer means. 202 (no body) waits; tokens end it; `google_failed` ends it;
 * a passing failure (no connection, a timeout, Render waking) waits, until the hand-off's 5 minutes pass.
 */
export function pollOutcome(result: ApiResult<Tokens | undefined>, elapsedMs: number): PollOutcome {
  if (result.ok && result.data) return { kind: 'done', tokens: result.data }
  if (!result.ok && result.code === 'google_failed') return { kind: 'failed', code: 'google_failed' }
  if (elapsedMs >= GOOGLE_LIMIT) return { kind: 'failed', code: 'google_timeout' }
  return { kind: 'wait' }
}

export interface GoogleWatch {
  onDone: (tokens: Tokens) => void
  onFailed: (code: string) => void
}

/**
 * Asks the API for the session every 3 s, and at once when the user comes back to MTF, until a
 * final answer or 5 minutes. Returns `stop`, for Cancel and for the sheet closing.
 */
export function watchGoogle(handoff: Handoff, { onDone, onFailed }: GoogleWatch): () => void {
  const startedAt = Date.now()
  const requests = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let asking = false
  let stopped = false

  const stop = () => {
    stopped = true
    clearTimeout(timer)
    requests.abort()
    document.removeEventListener('visibilitychange', onVisible)
  }

  const ask = async () => {
    if (stopped || asking) return
    clearTimeout(timer)
    asking = true
    const result = await apiRequest<Tokens | undefined>('/api/auth/google/exchange', {
      body: { secret: handoff.secret },
      signal: requests.signal,
    })
    asking = false
    if (stopped) return

    const outcome = pollOutcome(result, Date.now() - startedAt)
    if (outcome.kind === 'done') {
      stop()
      onDone(outcome.tokens)
    } else if (outcome.kind === 'failed') {
      stop()
      onFailed(outcome.code)
    } else {
      timer = setTimeout(ask, Math.min(POLL_EVERY, Math.max(0, startedAt + GOOGLE_LIMIT - Date.now())))
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') void ask()
  }

  document.addEventListener('visibilitychange', onVisible)
  timer = setTimeout(ask, POLL_EVERY)
  return stop
}

/**
 * Watches the hand-off while `handoff` is set, and stops when it is cleared (Cancel) or the
 * component unmounts (the sheet closed). The latest handlers are always the ones called.
 */
export function useGoogleWatch(handoff: Handoff | null, handlers: GoogleWatch): void {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })
  useEffect(() => {
    if (!handoff) return
    return watchGoogle(handoff, {
      onDone: (tokens) => latest.current.onDone(tokens),
      onFailed: (code) => latest.current.onFailed(code),
    })
  }, [handoff])
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
