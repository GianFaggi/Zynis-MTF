import { API_URL, apiRequest, readApiAnswer, withSession, type ApiResult } from '../account/api'
import { refreshSession, sessionAccess, useAccountStore } from '../account/accountStore'
import type { SyncRecord } from '../types'

// Sync's requests (#37, design D2, D3, D7), all through the session: `withSession` renews the access
// token when there is none and once more on a 401; `apiRequest` wakes Render first and sends once.

/** The most one push request carries; the server accepts up to 1 MB. */
export const PUSH_CHUNK_BYTES = 512 * 1024
/** A leave send up to this size goes with `keepalive`, under the browser's 64 KB cap for a page. */
export const KEEPALIVE_BYTES = 60 * 1024
/** Renew before a leave send when the access token has less than this left (ms). */
export const RENEW_BEFORE = 60_000

/** What a push managed: the records the server confirmed, and the failure that stopped it, if any. */
export interface PushOutcome {
  sent: SyncRecord[]
  failure?: Extract<ApiResult<unknown>, { ok: false }>
}

interface PullPage {
  records: SyncRecord[]
  next: number
  more: boolean
}

const encoder = new TextEncoder()

function bytes(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).byteLength
}

/** The body's own bytes around the records: `{"records":[` … `]}`. */
const ENVELOPE = bytes({ records: [] })

/** Records in requests of at most `maxBytes` each, in order. A single larger record still goes, alone. */
export function chunkRecords(records: readonly SyncRecord[], maxBytes = PUSH_CHUNK_BYTES): SyncRecord[][] {
  const chunks: SyncRecord[][] = []
  let chunk: SyncRecord[] = []
  let size = ENVELOPE
  for (const record of records) {
    const recordSize = bytes(record)
    // Each record after the first adds a comma.
    if (chunk.length > 0 && size + 1 + recordSize > maxBytes) {
      chunks.push(chunk)
      chunk = []
      size = ENVELOPE
    }
    size += recordSize + (chunk.length > 0 ? 1 : 0)
    chunk.push(record)
  }
  if (chunk.length > 0) chunks.push(chunk)
  return chunks
}

/** Sends records in chunks of at most 512 KB, one after the other, stopping at the first failure. */
export async function pushRecords(records: readonly SyncRecord[], signal?: AbortSignal): Promise<PushOutcome> {
  const sent: SyncRecord[] = []
  for (const chunk of chunkRecords(records)) {
    const result = await withSession(sessionAccess(signal), (accessToken) =>
      apiRequest<unknown>('/api/sync/push', { body: { records: chunk }, accessToken, signal }),
    )
    if (!result.ok) return { sent, failure: result }
    sent.push(...chunk)
  }
  return { sent }
}

/** Every record of the Account changed after `after`, fetching pages until none is left. */
export async function pullRecords(after: number, signal?: AbortSignal): Promise<ApiResult<{ records: SyncRecord[]; next: number }>> {
  const records: SyncRecord[] = []
  let cursor = after
  for (;;) {
    const page = await withSession(sessionAccess(signal), (accessToken) =>
      apiRequest<PullPage>(`/api/sync/pull?after=${cursor}`, { method: 'GET', accessToken, signal }),
    )
    if (!page.ok) return page
    records.push(...page.data.records)
    cursor = page.data.next
    if (!page.data.more) return { ok: true, data: { records, next: cursor } }
  }
}

/**
 * The leave send: what is pending, while the page is being hidden or closed. Up to 60 KB it goes as
 * one `keepalive` request, which the browser keeps sending after the page is gone, straight to the
 * API (no wake: the keep-awake has kept it up while there was something to send). Larger batches go
 * as ordinary pushes. With `renew`, an access token about to expire is renewed first; on `pagehide`
 * there is no time for that, and a refused send simply stays pending for the next arrival.
 */
export async function leaveSend(records: readonly SyncRecord[], { renew }: { renew: boolean }): Promise<PushOutcome> {
  if (records.length === 0) return { sent: [] }
  if (bytes({ records }) > KEEPALIVE_BYTES) return pushRecords(records)

  const { accessTokenExpiresAt } = useAccountStore.getState()
  let { accessToken } = useAccountStore.getState()
  const expiring = accessTokenExpiresAt !== null && accessTokenExpiresAt - Date.now() < RENEW_BEFORE
  if (renew && (!accessToken || expiring)) {
    const renewed = await refreshSession()
    if (!renewed.ok) return { sent: [], failure: renewed }
    accessToken = renewed.data
  }
  if (!accessToken) return { sent: [], failure: { ok: false, code: 'session_ended' } }
  if (!navigator.onLine) return { sent: [], failure: { ok: false, code: 'offline' } }

  try {
    const response = await fetch(`${API_URL}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ records }),
      keepalive: true,
    })
    const result = await readApiAnswer<unknown>(response)
    return result.ok ? { sent: [...records] } : { sent: [], failure: result }
  } catch {
    return { sent: [], failure: { ok: false, code: 'network' } }
  }
}
