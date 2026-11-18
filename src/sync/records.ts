import type { Area, Card, MtfData, RecordKey, RecordKind, SyncRecord, WinEvent } from '../types'

// The Desk as sync records (#37, design D1, D5): every Area, every Card with its Items inside,
// every Win event (kind `win`). Pure: no storage, no network.

export type Entity = Area | Card | WinEvent

export function keyOf(kind: RecordKind, id: string): RecordKey {
  return `${kind}:${id}`
}

export function parseKey(key: RecordKey): { kind: RecordKind; id: string } {
  const at = key.indexOf(':')
  return { kind: key.slice(0, at) as RecordKind, id: key.slice(at + 1) }
}

/** Every entity of the document by record key, in document order. */
export function entitiesOf(data: MtfData): Map<RecordKey, Entity> {
  const entities = new Map<RecordKey, Entity>()
  for (const area of data.areas) entities.set(keyOf('area', area.id), area)
  for (const card of data.cards) entities.set(keyOf('card', card.id), card)
  for (const event of data.events) entities.set(keyOf('win', event.id), event)
  return entities
}

/** The entity's own change time: `updatedAt`, or `at` for a Win event, which is never edited. */
export function changedAt(entity: Entity): number {
  return 'updatedAt' in entity ? entity.updatedAt : entity.at
}

export function toRecord(kind: RecordKind, entity: Entity, updatedAt = changedAt(entity)): SyncRecord {
  return { kind, id: entity.id, updatedAt, deleted: false, data: entity }
}

/** The whole document as live records, in document order. */
export function toRecords(data: MtfData): SyncRecord[] {
  return [
    ...data.areas.map((area) => toRecord('area', area)),
    ...data.cards.map((card) => toRecord('card', card)),
    ...data.events.map((event) => toRecord('win', event)),
  ]
}

/** A document from live records, in the order given; deletions are skipped. */
export function fromRecords(records: readonly SyncRecord[], schemaVersion: number): MtfData {
  const data: MtfData = { schemaVersion, areas: [], cards: [], events: [] }
  for (const record of records) {
    if (record.deleted || !record.data) continue
    if (record.kind === 'area') data.areas.push(record.data as Area)
    else if (record.kind === 'card') data.cards.push(record.data as Card)
    else data.events.push(record.data as WinEvent)
  }
  return data
}

/**
 * The same order on every device for a Desk built from the server: Areas by creation (the default
 * row, created together, left to right), Cards by creation, Win events by time. Ties fall to the id.
 */
export function canonicalOrder(data: MtfData): MtfData {
  return {
    ...data,
    areas: data.areas.toSorted(
      (a, b) => a.createdAt - b.createdAt || a.rect.y - b.rect.y || a.rect.x - b.rect.x || compareIds(a.id, b.id),
    ),
    cards: data.cards.toSorted((a, b) => a.createdAt - b.createdAt || compareIds(a.id, b.id)),
    events: data.events.toSorted((a, b) => a.at - b.at || compareIds(a.id, b.id)),
  }
}

export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Deep equality for plain JSON values, so an equal entity from another reference counts as unchanged. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => sameValue(value, b[index]))
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left).filter((key) => left[key] !== undefined)
  const otherKeys = Object.keys(right).filter((key) => right[key] !== undefined)
  return keys.length === otherKeys.length && keys.every((key) => sameValue(left[key], right[key]))
}
