// Stored entity shapes (KB/frontend/storage.md). Every entity has a uuid `id`;
// Areas, Cards and Items also carry `createdAt` / `updatedAt` (epoch ms) so V2
// sync is an addition, not a rewrite. Positions are in Desk coordinates.

export type Language = 'es' | 'en'

/** A device setting, like the language: `'system'` follows the device's light/dark mode. */
export type Theme = 'system' | 'light' | 'dark'

export type AreaId = string

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
