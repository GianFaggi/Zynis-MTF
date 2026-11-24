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

/**
 * How one stroke looks (#51, ADR 0014): the pen it was drawn with. Also the shape of a pen
 * (`Pens`), a device setting.
 */
export interface InkStyle {
  /** Lowercase `#rrggbb`; `null` is Tinta, which follows the theme's ink color. */
  color: string | null
  /** The perfect-freehand size in box units, an integer (`INK_SIZES`). */
  size: number
}

/**
 * A Card's handwriting (#47, ADR 0013). Points are in box coordinates: the box is always
 * `INK_WIDTH` (1000) units wide and `height` units tall. Each stroke is a flat list of
 * integers `[x, y, p, x, y, p, …]`, with `p` the pressure 0–100. A Card never keeps
 * an `Ink` with no strokes: `closeCard` removes it.
 */
export interface Ink {
  height: number
  strokes: number[][]
  /**
   * `styles[i]` is how `strokes[i]` looks (#51, ADR 0014). Left out when every stroke is Tinta
   * Medio. Read only through `strokeStyles`: a length that differs from `strokes` (left by a
   * version without pens) reads as all Tinta Medio.
   */
  styles?: InkStyle[]
}

/** The four pens of the handwriting box and the chosen one (#51): a device setting (`mtf_pens`), never in `MtfData`. */
export interface Pens {
  chosen: 0 | 1 | 2 | 3
  /** Pen 0 is Tinta: its `color` is always `null`. */
  pens: [InkStyle, InkStyle, InkStyle, InkStyle]
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
  /** Handwriting (#47); missing = none. Optional, so Cards from before it need no migration. */
  ink?: Ink
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
