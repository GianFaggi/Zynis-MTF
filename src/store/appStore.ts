import { create } from 'zustand'
import { areaForPoint, cleanName, defaultAreas, freeSlot, nextColor, sameRect, spotIn } from '../desk/areas'
import { isEmptyCard, isFinished } from '../desk/cardText'
import { CARD_WIDTH, FALLBACK_CARD_HEIGHT, randomTilt, type Point, type Rect } from '../desk/geometry'
import { tidyLayout } from '../desk/tidy'
import { detectLanguage } from '../i18n/detect'
import { newId } from '../lib/id'
import {
  loadArrangement,
  loadData,
  loadLanguage,
  loadTheme,
  saveData,
  saveLanguage,
  saveTheme,
  saveArrangement as storeArrangement,
} from '../lib/storage'
import type { Area, AreaColor, AreaId, Card, Item, Language, MtfData, SavedArrangement, Theme, WinEvent } from '../types'
import { cardDeleted, cardJarred, itemToggled, itemsRemoved, jarVerdict, noteWritten, syncCardWin, type JarVerdict } from '../wins/rules'

// The single in-memory source of truth for saved data (KB/frontend/architecture.md).
// Components read slices of it; only this store talks to the storage layer. View
// state (pan/zoom, open sheets, search) lives in `deskStore` and is never saved.
// Every action replaces `data` immutably and sets `updatedAt` on what it touches.
// Win events follow the Cards through the pure rules in `src/wins/rules.ts`: a Card
// and its events always change in the same `data` replacement.

/** What checking or unchecking an Item did, so the caller can celebrate. */
export type ToggleOutcome = 'checked' | 'finished' | 'unchecked'

export interface AppState {
  data: MtfData
  language: Language
  setLanguage: (language: Language) => void
  theme: Theme
  setTheme: (theme: Theme) => void

  /** Adds Trabajo, Vida and Recordar when no Area is stored. Runs once on create. */
  ensureDefaultAreas: () => void
  /** A new empty Card centered on `point` (Desk coordinates), on top of the others. Returns its id. */
  createCard: (point: Point) => string | undefined
  updateCard: (id: string, patch: Partial<Pick<Card, 'title' | 'body'>>) => void
  /** A new empty Item at the end, or right after `afterItemId`. Returns its id; its text is typed with `updateItem`. */
  addItem: (cardId: string, afterItemId?: string) => string | undefined
  updateItem: (cardId: string, itemId: string, text: string) => void
  /** `'finished'` when this check finished the Card; `undefined` when the Item does not exist. */
  toggleItem: (cardId: string, itemId: string) => ToggleOutcome | undefined
  removeItem: (cardId: string, itemId: string) => void
  togglePin: (id: string) => void
  /** Ends a drag: the Card's new top-left `position`, its Area from its center, a new tilt, on top. */
  dropCard: (id: string, position: Point, height?: number) => void
  /** Moves a Card into another Area without dragging (the Place selector). */
  placeCard: (id: string, areaId: AreaId) => void
  /** Tidy up, with the rendered height of each Card. */
  tidyUp: (heights: ReadonlyMap<string, number>) => void
  deleteCard: (id: string) => void
  /** When the editor closes: drops blank Items, and the whole Card if it is left empty. A kept new Card counts as a note. */
  closeCard: (id: string, options?: { isNew?: boolean }) => void
  /** Puts a Card in the Jar. Refuses, writing nothing, a Card with unchecked Items, an empty one, or one already in the Jar. */
  jarCard: (id: string) => JarVerdict
  /** Takes a Card out of the Jar, back inside its Area and on top. */
  returnCard: (id: string) => void
  /** Import: the whole document becomes `data`, already validated (at least one Area). The language, the theme and the saved arrangement stay. */
  replaceData: (data: MtfData) => void

  /** A new Area in the first free slot, in the first unused color. `name` is the provisional name, already translated. Returns its id. */
  createArea: (name: string) => string
  /** Renames an Area as typed (`cleanName`): left empty, a default Area goes back to its translated name. */
  renameArea: (id: string, typed: string) => void
  recolorArea: (id: string, color: AreaColor) => void
  /** Ends an Area move: shifts the Area and its Desk Cards. The Desk has already checked it overlaps no Area. */
  moveArea: (id: string, dx: number, dy: number) => void
  /** Ends an Area resize with the new rect. The Desk has already checked the minimum size and the overlap. */
  resizeArea: (id: string, rect: Rect) => void
  /** Removes an Area; its Cards go to `destinationId`. Refuses, writing nothing, the last Area or a missing or same destination. */
  deleteArea: (id: string, destinationId: string) => void
  /** Moves every Area to its target rect (`arrange.ts`), its Desk Cards along, in one write. Trusts the targets not to overlap. */
  arrangeAreas: (targets: ReadonlyMap<AreaId, Rect>) => void

  /** "Mi disposición": a device setting, kept out of `data` and of the Backup. `null` until the user saves one. */
  arrangement: SavedArrangement | null
  /** Saves where every Area is now as "Mi disposición", replacing the previous one. */
  saveArrangement: () => void
}

/** Brings `events` in line with a Card that just changed. */
type WinsRule = (events: WinEvent[], card: Card, now: number) => WinEvent[]

const syncWins: WinsRule = (events, card, now) => syncCardWin(events, card, now, newId)

function topZ(cards: readonly Card[]): number {
  return Math.max(0, ...cards.map((card) => card.position.z)) + 1
}

function findCard(data: MtfData, id: string): Card | undefined {
  return data.cards.find((card) => card.id === id)
}

/**
 * `data` with one Card replaced by `change(card, now)` and its events updated by `wins`
 * in the same replacement. The same `data` when the Card does not exist or did not change.
 */
function withCard(data: MtfData, id: string, change: (card: Card, now: number) => Card, wins?: WinsRule): MtfData {
  const index = data.cards.findIndex((card) => card.id === id)
  if (index === -1) return data
  const now = Date.now()
  const card = change(data.cards[index], now)
  if (card === data.cards[index]) return data
  return { ...data, cards: data.cards.with(index, card), events: wins ? wins(data.events, card, now) : data.events }
}

function withItem(data: MtfData, cardId: string, itemId: string, change: (item: Item) => Partial<Item>, wins?: WinsRule): MtfData {
  return withCard(
    data,
    cardId,
    (card, now) => {
      if (!card.items.some((item) => item.id === itemId)) return card
      return {
        ...card,
        items: card.items.map((item) => (item.id === itemId ? { ...item, ...change(item), updatedAt: now } : item)),
        updatedAt: now,
      }
    },
    wins,
  )
}

/**
 * `cards` with every Desk Card of an Area in `shifts` moved by that Area's shift, so
 * Cards travel with their Area (ADR 0007). Area, tilt and `z` are kept; Cards in the
 * Jar have no place on the Desk and are left alone.
 */
function withAreaCardsShifted(cards: Card[], shifts: ReadonlyMap<AreaId, Point>, now: number): Card[] {
  if (shifts.size === 0) return cards
  return cards.map((card) => {
    const shift = shifts.get(card.areaId)
    if (!shift || card.jarredAt !== null) return card
    return { ...card, position: { ...card.position, x: card.position.x + shift.x, y: card.position.y + shift.y }, updatedAt: now }
  })
}

/** `data` with one Area replaced by `change(area, now)`. The same `data` when the Area does not exist or did not change. */
function withArea(data: MtfData, id: string, change: (area: Area, now: number) => Area): MtfData {
  const index = data.areas.findIndex((area) => area.id === id)
  if (index === -1) return data
  const area = change(data.areas[index], Date.now())
  if (area === data.areas[index]) return data
  return { ...data, areas: data.areas.with(index, area) }
}

export function createAppStore() {
  const store = create<AppState>()((set, get) => {
    const update = (change: (data: MtfData) => MtfData) => set((state) => ({ data: change(state.data) }))

    return {
      data: loadData(),
      language: loadLanguage() ?? detectLanguage(navigator.languages),
      setLanguage: (language) => {
        set({ language })
        saveLanguage(language)
      },
      theme: loadTheme() ?? 'system',
      setTheme: (theme) => {
        set({ theme })
        saveTheme(theme)
      },
      arrangement: loadArrangement(),

      ensureDefaultAreas: () =>
        update((data) => (data.areas.length > 0 ? data : { ...data, areas: defaultAreas(Date.now()) })),

      createCard: (point) => {
        const { data } = get()
        const area = areaForPoint(data.areas, point)
        if (!area) return undefined
        const now = Date.now()
        const card: Card = {
          id: newId(),
          areaId: area.id,
          title: '',
          body: '',
          items: [],
          pinned: false,
          position: {
            x: Math.round(point.x - CARD_WIDTH / 2),
            y: Math.round(point.y - 40),
            tilt: randomTilt(Math.random),
            z: topZ(data.cards),
          },
          jarredAt: null,
          createdAt: now,
          updatedAt: now,
        }
        update((current) => ({ ...current, cards: [...current.cards, card] }))
        return card.id
      },

      updateCard: (id, patch) => update((data) => withCard(data, id, (card, now) => ({ ...card, ...patch, updatedAt: now }))),

      addItem: (cardId, afterItemId) => {
        if (!findCard(get().data, cardId)) return undefined
        const id = newId()
        update((data) =>
          withCard(
            data,
            cardId,
            (card, now) => {
              const items = [...card.items]
              const after = items.findIndex((item) => item.id === afterItemId)
              items.splice(after === -1 ? items.length : after + 1, 0, { id, text: '', done: false, createdAt: now, updatedAt: now })
              return { ...card, items, updatedAt: now }
            },
            syncWins,
          ),
        )
        return id
      },

      updateItem: (cardId, itemId, text) => update((data) => withItem(data, cardId, itemId, () => ({ text }), syncWins)),

      toggleItem: (cardId, itemId) => {
        const before = findCard(get().data, cardId)
        if (!before?.items.some((item) => item.id === itemId)) return undefined
        update((data) =>
          withItem(
            data,
            cardId,
            itemId,
            (item) => ({ done: !item.done }),
            (events, card, now) => itemToggled(events, card, itemId, now, newId),
          ),
        )
        const after = findCard(get().data, cardId)!
        if (!after.items.find((item) => item.id === itemId)!.done) return 'unchecked'
        return isFinished(after) && !isFinished(before) ? 'finished' : 'checked'
      },

      removeItem: (cardId, itemId) =>
        update((data) =>
          withCard(
            data,
            cardId,
            (card, now) => ({ ...card, items: card.items.filter((item) => item.id !== itemId), updatedAt: now }),
            (events, card, now) => syncWins(itemsRemoved(events, [itemId]), card, now),
          ),
        ),

      togglePin: (id) => update((data) => withCard(data, id, (card, now) => ({ ...card, pinned: !card.pinned, updatedAt: now }))),

      dropCard: (id, position, height = FALLBACK_CARD_HEIGHT) =>
        update((data) => {
          const center = { x: position.x + CARD_WIDTH / 2, y: position.y + height / 2 }
          const area = areaForPoint(data.areas, center)
          const z = topZ(data.cards)
          return withCard(data, id, (card, now) => ({
            ...card,
            areaId: area?.id ?? card.areaId,
            position: { x: Math.round(position.x), y: Math.round(position.y), tilt: randomTilt(Math.random), z },
            updatedAt: now,
          }))
        }),

      placeCard: (id, areaId) =>
        update((data) => {
          const area = data.areas.find((candidate) => candidate.id === areaId)
          if (!area) return data
          const z = topZ(data.cards)
          return withCard(data, id, (card, now) => ({
            ...card,
            areaId,
            position: { ...card.position, ...spotIn(area, Math.random), z },
            updatedAt: now,
          }))
        }),

      tidyUp: (heights) =>
        update((data) => {
          const positions = tidyLayout(data.areas, data.cards, heights, Math.random)
          const now = Date.now()
          return {
            ...data,
            cards: data.cards.map((card) => {
              const next = positions.get(card.id)
              return next ? { ...card, position: { ...card.position, ...next }, updatedAt: now } : card
            }),
          }
        }),

      deleteCard: (id) =>
        update((data) => {
          if (!findCard(data, id)) return data
          return { ...data, cards: data.cards.filter((card) => card.id !== id), events: cardDeleted(data.events, id) }
        }),

      closeCard: (id, { isNew = false } = {}) =>
        update((data) => {
          const card = findCard(data, id)
          if (!card) return data
          if (isEmptyCard(card)) {
            return { ...data, cards: data.cards.filter((candidate) => candidate.id !== id), events: cardDeleted(data.events, id) }
          }
          const now = Date.now()
          const blank = card.items.filter((item) => item.text.trim() === '').map((item) => item.id)
          let kept = card
          let events = data.events
          if (blank.length > 0) {
            kept = { ...card, items: card.items.filter((item) => !blank.includes(item.id)), updatedAt: now }
            events = syncCardWin(itemsRemoved(events, blank), kept, now, newId)
          }
          if (isNew) events = noteWritten(events, kept, now, newId)
          if (kept === card && events === data.events) return data
          return { ...data, cards: data.cards.map((candidate) => (candidate.id === id ? kept : candidate)), events }
        }),

      jarCard: (id) => {
        const card = findCard(get().data, id)
        if (!card || card.jarredAt !== null || isEmptyCard(card)) return { ok: false, pending: 0 }
        const verdict = jarVerdict(card)
        if (!verdict.ok) return verdict
        update((data) =>
          withCard(
            data,
            id,
            (current, now) => ({ ...current, jarredAt: now, updatedAt: now }),
            (events, current, now) => cardJarred(events, current, now, newId),
          ),
        )
        return verdict
      },

      returnCard: (id) =>
        update((data) => {
          const card = findCard(data, id)
          if (!card || card.jarredAt === null) return data
          // Its own Area; if that is gone (custom Areas, #7), the Area nearest to where it was.
          const area = data.areas.find((candidate) => candidate.id === card.areaId) ?? areaForPoint(data.areas, card.position)
          const z = topZ(data.cards)
          return withCard(
            data,
            id,
            (current, now) => ({
              ...current,
              areaId: area?.id ?? current.areaId,
              position: { ...current.position, ...(area && spotIn(area, Math.random)), z },
              jarredAt: null,
              updatedAt: now,
            }),
            syncWins,
          )
        }),

      replaceData: (data) => set({ data }),

      createArea: (name) => {
        const now = Date.now()
        const id = newId()
        update((data) => {
          const area: Area = { id, name, color: nextColor(data.areas), rect: freeSlot(data.areas), createdAt: now, updatedAt: now }
          return { ...data, areas: [...data.areas, area] }
        })
        return id
      },

      renameArea: (id, typed) =>
        update((data) =>
          withArea(data, id, (area, now) => {
            const name = cleanName(area, typed)
            if (name === area.name) return area
            if (name !== undefined) return { ...area, name, updatedAt: now }
            // No `name` at all, rather than `name: undefined`, so the stored Area matches a fresh default one.
            const renamed = { ...area, updatedAt: now }
            delete renamed.name
            return renamed
          }),
        ),

      recolorArea: (id, color) =>
        update((data) => withArea(data, id, (area, now) => (area.color === color ? area : { ...area, color, updatedAt: now }))),

      moveArea: (id, dx, dy) =>
        update((data) => {
          const x = Math.round(dx)
          const y = Math.round(dy)
          if (x === 0 && y === 0) return data
          const moved = withArea(data, id, (area, now) => ({
            ...area,
            rect: { ...area.rect, x: area.rect.x + x, y: area.rect.y + y },
            updatedAt: now,
          }))
          if (moved === data) return data
          return { ...moved, cards: withAreaCardsShifted(data.cards, new Map([[id, { x, y }]]), Date.now()) }
        }),

      resizeArea: (id, rect) =>
        update((data) => withArea(data, id, (area, now) => (sameRect(area.rect, rect) ? area : { ...area, rect: { ...rect }, updatedAt: now }))),

      arrangeAreas: (targets) =>
        update((data) => {
          const now = Date.now()
          const shifts = new Map<AreaId, Point>()
          const areas = data.areas.map((area) => {
            const rect = targets.get(area.id)
            if (!rect || sameRect(area.rect, rect)) return area
            // "Mi disposición" may also bring back a saved size; only a new top-left moves the Cards.
            if (rect.x !== area.rect.x || rect.y !== area.rect.y) shifts.set(area.id, { x: rect.x - area.rect.x, y: rect.y - area.rect.y })
            return { ...area, rect: { ...rect }, updatedAt: now }
          })
          if (areas.every((area, index) => area === data.areas[index])) return data
          return { ...data, areas, cards: withAreaCardsShifted(data.cards, shifts, now) }
        }),

      saveArrangement: () => {
        const rects = Object.fromEntries(get().data.areas.map((area) => [area.id, { ...area.rect }]))
        const arrangement = { rects, savedAt: Date.now() }
        set({ arrangement })
        storeArrangement(arrangement)
      },

      deleteArea: (id, destinationId) =>
        update((data) => {
          const destination = data.areas.find((area) => area.id === destinationId)
          if (data.areas.length < 2 || destinationId === id || !destination || !data.areas.some((area) => area.id === id)) return data
          const now = Date.now()
          const top = topZ(data.cards)
          // Desk Cards land on top of every other Card, keeping their stacking order among themselves.
          const onDesk = data.cards
            .filter((card) => card.areaId === id && card.jarredAt === null)
            .sort((a, b) => a.position.z - b.position.z)
          const zOf = new Map(onDesk.map((card, index) => [card.id, top + index]))
          return {
            ...data,
            areas: data.areas.filter((area) => area.id !== id),
            cards: data.cards.map((card) => {
              if (card.areaId !== id) return card
              const z = zOf.get(card.id)
              if (z === undefined) return { ...card, areaId: destinationId, updatedAt: now }
              return { ...card, areaId: destinationId, position: { ...card.position, ...spotIn(destination, Math.random), z }, updatedAt: now }
            }),
          }
        }),
    }
  })

  // Persist the document whenever it is replaced. A drag writes once, on drop.
  store.subscribe((state, previous) => {
    if (state.data !== previous.data) saveData(state.data)
  })
  store.getState().ensureDefaultAreas()

  return store
}

export const useAppStore = createAppStore()
