import { areaForPoint, defaultAreas, spotIn } from '../desk/areas'
import type { Random } from '../desk/geometry'
import type { Card, MtfData, RecordKey, SyncRecord } from '../types'
import type { Pending } from './outbox'
import { entitiesOf, keyOf, sameValue, type Entity } from './records'

// Merging fetched records into this device's Desk, one by one (#37, design D9, D11). Pure.

export interface MergeResult {
  data: MtfData
  /** True only when the local document actually changed, so a device's own changes coming back are quiet. */
  changed: boolean
  /** Records for the Card open in the editor (and its Wins), merged when it closes. */
  held: SyncRecord[]
}

/** Does this record belong to the Card being edited: the Card itself, or one of its Wins? */
function belongsTo(record: SyncRecord, cardId: string, local: ReadonlyMap<RecordKey, Entity>): boolean {
  if (record.kind === 'card') return record.id === cardId
  if (record.kind !== 'win') return false
  const event = (record.data ?? local.get(keyOf('win', record.id))) as { cardId?: string } | undefined
  return event?.cardId === cardId
}

/**
 * Applies each fetched record on its own: with no pending entry here it wins (replaced, added, or
 * removed when deleted); a pending entry at least as new keeps the local version, which the next push
 * sends. Records for `editingId` go to `held` instead.
 */
export function mergeRecords(
  data: MtfData,
  incoming: readonly SyncRecord[],
  pending: Pending,
  { editingId = null }: { editingId?: string | null } = {},
): MergeResult {
  // A record may come twice across pages or with what was held: its newest version counts.
  const newest = new Map<RecordKey, SyncRecord>()
  for (const record of incoming) {
    const key = keyOf(record.kind, record.id)
    const seen = newest.get(key)
    if (!seen || seen.updatedAt <= record.updatedAt) newest.set(key, record)
  }

  const local = entitiesOf(data)
  const held: SyncRecord[] = []
  const result = new Map(local)
  let changed = false

  for (const [key, record] of newest) {
    if (editingId !== null && belongsTo(record, editingId, local)) {
      held.push(record)
      continue
    }
    const entry = pending[key]
    if (entry && entry.at >= record.updatedAt) continue
    const existing = result.get(key)
    if (record.deleted || !record.data) {
      if (existing) {
        result.delete(key)
        changed = true
      }
    } else if (!existing || !sameValue(existing, record.data)) {
      result.set(key, record.data)
      changed = true
    }
  }

  if (!changed) return { data, changed, held }
  return { data: rebuild(data, result), changed, held }
}

/** The document from the merged entities: existing ones keep their place, new ones are appended. */
function rebuild(data: MtfData, entities: ReadonlyMap<RecordKey, Entity>): MtfData {
  const next: MtfData = { schemaVersion: data.schemaVersion, areas: [], cards: [], events: [] }
  for (const [key, entity] of entities) {
    if (key.startsWith('area:')) next.areas.push(entity as MtfData['areas'][number])
    else if (key.startsWith('card:')) next.cards.push(entity as Card)
    else next.events.push(entity as MtfData['events'][number])
  }
  return next
}

/**
 * Fixes what two devices can each leave half-done while offline, as a local change: a Card whose
 * Area is gone moves to the Area nearest its position (on the Desk, to a free-looking spot in it;
 * in the Jar, only its Area), and a Desk left with no Area gets the default Areas back.
 */
export function repairDesk(data: MtfData, now: number, random: Random = Math.random): MtfData {
  let next = data
  if (next.areas.length === 0) next = { ...next, areas: defaultAreas(now) }
  const areaIds = new Set(next.areas.map((area) => area.id))
  if (next.cards.every((card) => areaIds.has(card.areaId))) return next
  const areas = next.areas
  return {
    ...next,
    cards: next.cards.map((card) => {
      if (areaIds.has(card.areaId)) return card
      const area = areaForPoint(areas, card.position) ?? areas[0]
      if (card.jarredAt !== null) return { ...card, areaId: area.id, updatedAt: now }
      return { ...card, areaId: area.id, position: { ...card.position, ...spotIn(area, random) }, updatedAt: now }
    }),
  }
}
