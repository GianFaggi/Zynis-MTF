import type { MtfData, PendingEntry, RecordKey, SyncRecord, SyncState } from '../types'
import { entitiesOf, parseKey, sameValue, toRecord } from './records'

// The outbox (#37, design D4): what changed on this device and is not confirmed by the server.
// Built by comparing the document before and after each replacement, so no store action has to
// know about sync. Pure.

export type Pending = SyncState['pending']

/**
 * What changed between two documents, each entry at `now`. Entities whose object reference is the
 * same are unchanged (actions keep the references they do not touch); a different reference counts
 * only if its content differs, so `replaceData` with an equal Desk adds nothing. A removed entity
 * becomes a tombstone.
 */
export function diffData(before: MtfData, after: MtfData, now: number): Pending {
  const changes: Pending = {}
  if (before === after) return changes
  const old = entitiesOf(before)
  const current = entitiesOf(after)
  for (const [key, entity] of current) {
    const previous = old.get(key)
    if (previous === entity) continue
    if (previous && sameValue(previous, entity)) continue
    changes[key] = { at: now }
  }
  for (const key of old.keys()) {
    if (!current.has(key)) changes[key] = { at: now, deleted: true }
  }
  return changes
}

/** `pending` with `changes` added; the newer entry for a key replaces the older one. */
export function addPending(pending: Pending, changes: Pending): Pending {
  const keys = Object.keys(changes) as RecordKey[]
  if (keys.length === 0) return pending
  const next: Pending = { ...pending }
  for (const key of keys) {
    const change = changes[key] as PendingEntry
    const existing = next[key]
    if (!existing || existing.at <= change.at) next[key] = change
  }
  return next
}

/**
 * The records to send for `pending`, read from the current document at send time, so a Card edited
 * ten times goes once. Each carries its entry's time as `updatedAt`; a key whose entity is gone goes
 * as a deletion.
 */
export function outgoing(pending: Pending, data: MtfData): SyncRecord[] {
  const entities = entitiesOf(data)
  return (Object.keys(pending) as RecordKey[]).map((key) => {
    const entry = pending[key] as PendingEntry
    const { kind, id } = parseKey(key)
    const entity = entry.deleted ? undefined : entities.get(key)
    return entity ? toRecord(kind, entity, entry.at) : { kind, id, updatedAt: entry.at, deleted: true }
  })
}

/**
 * `pending` after the server confirmed a push of `sent`: an entry goes only when what was sent is
 * at least as new as it, so a Card edited while the push was on its way stays pending.
 */
export function confirmSent(pending: Pending, sent: readonly SyncRecord[]): Pending {
  let next: Pending | undefined
  for (const record of sent) {
    const key = `${record.kind}:${record.id}` as RecordKey
    const entry = (next ?? pending)[key]
    if (!entry || entry.at > record.updatedAt) continue
    next ??= { ...pending }
    delete next[key]
  }
  return next ?? pending
}
