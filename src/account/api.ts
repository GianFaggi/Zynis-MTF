import { WAIT_LIMIT } from '../sync/wait'

// MTF's only network requests, all to its own API and only from the Account sheet
// (openspec/specs/accounts, design decision 9). Nothing here runs at launch.

/** The API's address: its own domain in production (ADR 0009, rule 6), the local API in development. */
export function apiBaseUrl(env: { VITE_API_URL?: string; DEV: boolean }): string {
  return env.VITE_API_URL ?? (env.DEV ? 'http://localhost:5000' : 'https://api.mtf.zynis.com.ar')
}

export const API_URL = apiBaseUrl(import.meta.env)

/** After `/health` answers, the API counts as awake for this long (ms): Render sleeps after 15 quiet minutes. */
export const AWAKE_FOR = 10 * 60 * 1000
/** While waking, `/health` is asked again this often (ms). */
export const WAKE_RETRY = 5_000

/**
 * A server code (`invalid_credentials`, `session_ended`, …) passed through as it came, or one of
 * the app's own: `offline` (no connection, nothing sent), `timeout` (no answer within the wait's
 * limit), `network` (the request failed, for example Render answering 503 with no CORS header)
 * and `aborted` (the sheet closed).
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; status?: number }

let awakeAt = Number.NEGATIVE_INFINITY
let waking: Promise<boolean> | null = null

/**
 * Wakes Render by asking `/health` until it answers or the wait's limit passes, and resolves
 * whether it answered. Instant within 10 minutes of an answer; calls made meanwhile share one wake.
 */
export function wakeApi(): Promise<boolean> {
  if (Date.now() - awakeAt < AWAKE_FOR) return Promise.resolve(true)
  waking ??= pollHealth().finally(() => {
    waking = null
  })
  return waking
}

/** Tests only: forget that the API answered, so each test starts asleep. */
export function resetWake(): void {
  awakeAt = Number.NEGATIVE_INFINITY
  waking = null
}

async function pollHealth(): Promise<boolean> {
  const deadline = Date.now() + WAIT_LIMIT
  for (;;) {
    if (await healthAnswers(deadline)) {
      awakeAt = Date.now()
      return true
    }
    if (Date.now() + WAKE_RETRY >= deadline) return false
    await sleep(WAKE_RETRY)
  }
}

async function healthAnswers(deadline: number): Promise<boolean> {
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), Math.max(0, deadline - Date.now()))
  try {
    return (await fetch(`${API_URL}/health`, { signal: timeout.signal })).ok
  } catch {
    // While Render spins up, a 503 with no CORS header reads as a network failure: "not yet".
    return false
  } finally {
    clearTimeout(timer)
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  accessToken?: string
  /** Aborted when the Account sheet closes. */
  signal?: AbortSignal
}

/**
 * One request: waits for the wake, then sends it exactly once. Retrying the request itself would
 * be wrong: a single-use reset link that succeeded with its answer lost would come back as
 * "this link no longer works". The whole attempt, wake included, gives up at the wait's limit.
 */
export async function apiRequest<T = void>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  if (!navigator.onLine) return { ok: false, code: 'offline' }

  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), WAIT_LIMIT)
  const signal = anySignal(options.signal, timeout.signal)
  const stopped = (): ApiResult<T> => ({ ok: false, code: options.signal?.aborted ? 'aborted' : 'timeout' })

  try {
    // A wake that gave up before this attempt's own limit starts again.
    while (!(await untilAborted(wakeApi(), signal))) {
      if (signal.aborted) return stopped()
    }
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'POST',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
    })
    return await readAnswer<T>(response)
  } catch {
    return signal.aborted ? stopped() : { ok: false, code: 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/** What renews a session: the access token in memory, and a renewal that yields a new one. */
export interface SessionAccess {
  accessToken: () => string | null
  refresh: () => Promise<ApiResult<string>>
}

/**
 * Calls the API with the access token, renewing it first when there is none, and once more
 * when the API answers 401 because it expired.
 */
export async function withSession<T>(
  session: SessionAccess,
  call: (accessToken: string) => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  let token = session.accessToken()
  let renewed = false
  if (!token) {
    const refreshed = await session.refresh()
    if (!refreshed.ok) return refreshed
    token = refreshed.data
    renewed = true
  }
  const result = await call(token)
  if (result.ok || result.status !== 401 || renewed) return result

  const refreshed = await session.refresh()
  return refreshed.ok ? call(refreshed.data) : refreshed
}

async function readAnswer<T>(response: Response): Promise<ApiResult<T>> {
  const text = await response.text()
  const body: unknown = text ? safeJson(text) : undefined
  if (response.ok) return { ok: true, data: body as T }

  const code = typeof body === 'object' && body !== null && 'code' in body ? (body as { code: unknown }).code : null
  return {
    ok: false,
    status: response.status,
    code: typeof code === 'string' ? code : response.status >= 500 ? 'server_error' : 'unknown',
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Resolves like `promise`, or `false` as soon as `signal` aborts. */
function untilAborted(promise: Promise<boolean>, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)
  return new Promise((resolve) => {
    const onAbort = () => resolve(false)
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, () => resolve(false)).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

function anySignal(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (!signal) continue
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return controller.signal
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
