// Stored entity shapes (KB/frontend/storage.md). Every entity has a uuid `id`;
// Areas, Cards and Items also carry `createdAt` / `updatedAt` (epoch ms) so V2
// sync is an addition, not a rewrite. Positions are in Desk coordinates.

export type Language = 'es' | 'en'

/** A device setting, like the language: `'system'` follows the device's light/dark mode. */
export type Theme = 'system' | 'light' | 'dark'

export type AreaId = string

/**
 * "Mi disposición": where every Area was when the user saved it. A device setting
 * (`mtf_arrangement`), like the theme: not part of `MtfData` nor of a Backup.
 */
export interface SavedArrangement {
  rects: Record<AreaId, Area['rect']>
  savedAt: number
}

/**
 * The account signed in on this device (#36, ADR 0010): its renewal token and email.
 * A device setting (`mtf_session`), like the theme: not part of `MtfData` nor of a Backup.
 */
export interface StoredSession {
  refreshToken: string
  email: string
}

/** The 12 Paper Area colors; `AREA_COLORS` in `src/desk/areas.ts` lists them in swatch order. */
export type AreaColor =
  | 'sage'
  | 'sand'
  | 'sky'
  | 'plum'
  | 'rose'
  | 'teal'
  | 'olive'
  | 'slate'
  | 'indigo'
  | 'turquoise'
  | 'pine'
  | 'berry'

export interface Area {
  id: AreaId
  /** Default Areas, translated by key. */
  key?: 'work' | 'life' | 'remember'
  /** Custom name; overrides `key`. */
  name?: string
  color: AreaColor
  rect: { x: number; y: number; w: number; h: number }
  createdAt: number
  updatedAt: number
}

export interface Item {
  id: string
  text: string
  done: boolean
  createdAt: number
  updatedAt: number
}

export interface Card {
  id: string
  areaId: AreaId
  title: string
  body: string
  items: Item[]
  pinned: boolean
  position: { x: number; y: number; tilt: number; z: number }
  /** In the Jar since; `null` = on the Desk. */
  jarredAt: number | null
  createdAt: number
  updatedAt: number
}

export interface WinEvent {
  id: string
  type: 'item' | 'card' | 'note'
  at: number
  cardId?: string
  itemId?: string
  /** Snapshot, so the event still reads well if the Card is deleted. */
  title?: string
  areaId?: AreaId
}

/** The whole stored document (`mtf_data`). */
export interface MtfData {
  schemaVersion: number
  areas: Area[]
  cards: Card[]
  events: WinEvent[]
}

/** What a sync record holds (#37): an Area, a Card with its Items, or a Win event (`win`, the glossary's word). */
export type RecordKind = 'area' | 'card' | 'win'

/** `kind:id`, the key of one record in the outbox and in a merge. */
export type RecordKey = `${RecordKind}:${string}`

/**
 * One Area, Card or Win as it travels to and from the server (#37, ADR 0012). `updatedAt` is the
 * moment the device made the change (epoch ms); `data` is the entity, absent on a deletion.
 */
export interface SyncRecord {
  kind: RecordKind
  id: string
  updatedAt: number
  deleted: boolean
  data?: Area | Card | WinEvent
}

/** A change waiting to be sent: when it was made, and whether it is a deletion (a tombstone). */
export interface PendingEntry {
  at: number
  deleted?: true
}

/**
 * This device's sync state (`mtf_sync`, #37). A device key, like the session: never part of
 * `MtfData` nor of a Backup, and an Import leaves it alone.
 */
export interface SyncState {
  /** The email this state belongs to; `null` on a device that never synced. Nothing is recorded without one. */
  owner: string | null
  /** The last server position this device has merged (`seq`); 0 = never. */
  cursor: number
  /** What changed here and is not confirmed by the server yet, by record key. */
  pending: Partial<Record<RecordKey, PendingEntry>>
  /** Fetched records for the Card open in the editor, merged when it closes. */
  held: SyncRecord[]
  /** Set when this Desk must become the Account's (Subir este, an Import, Recuperar): the moment it was decided. */
  claim: number | null
  /** When the last sync finished (epoch ms). */
  lastSyncAt: number | null
}
