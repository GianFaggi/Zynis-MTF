import { create } from 'zustand'
import { areaForPoint, defaultAreas, spotIn } from '../desk/areas'
import { isEmptyCard } from '../desk/cardText'
import { CARD_WIDTH, FALLBACK_CARD_HEIGHT, randomTilt, type Point } from '../desk/geometry'
import { tidyLayout } from '../desk/tidy'
import { detectLanguage } from '../i18n/detect'
import { newId } from '../lib/id'
import { loadData, loadLanguage, saveData, saveLanguage } from '../lib/storage'
import type { AreaId, Card, Item, Language, MtfData } from '../types'

// The single in-memory source of truth for saved data (KB/frontend/architecture.md).
// Components read slices of it; only this store talks to the storage layer. View
// state (pan/zoom, open sheets, search) lives in `deskStore` and is never saved.
// Every action replaces `data` immutably and sets `updatedAt` on what it touches.

export interface AppState {
  data: MtfData
  language: Language
  setLanguage: (language: Language) => void

  /** Adds Trabajo, Vida and Recordar when no Area is stored. Runs once on create. */
  ensureDefaultAreas: () => void
  /** A new empty Card centered on `point` (Desk coordinates), on top of the others. Returns its id. */
  createCard: (point: Point) => string | undefined
  updateCard: (id: string, patch: Partial<Pick<Card, 'title' | 'body'>>) => void
  /** A new empty Item at the end, or right after `afterItemId`. Returns its id; its text is typed with `updateItem`. */
  addItem: (cardId: string, afterItemId?: string) => string | undefined
  updateItem: (cardId: string, itemId: string, text: string) => void
  toggleItem: (cardId: string, itemId: string) => void
  removeItem: (cardId: string, itemId: string) => void
  togglePin: (id: string) => void
  /** Ends a drag: the Card's new top-left `position`, its Area from its center, a new tilt, on top. */
  dropCard: (id: string, position: Point, height?: number) => void
  /** Moves a Card into another Area without dragging (the Place selector). */
  placeCard: (id: string, areaId: AreaId) => void
  /** Tidy up, with the rendered height of each Card. */
  tidyUp: (heights: ReadonlyMap<string, number>) => void
  deleteCard: (id: string) => void
  /** When the editor closes: drops blank Items, and the whole Card if it is left empty. */
  closeCard: (id: string) => void
}

function topZ(cards: readonly Card[]): number {
  return Math.max(0, ...cards.map((card) => card.position.z)) + 1
}

/** `data` with one Card replaced by `change(card, now)`; the same `data` when the Card does not exist. */
function withCard(data: MtfData, id: string, change: (card: Card, now: number) => Card): MtfData {
  const index = data.cards.findIndex((card) => card.id === id)
  if (index === -1) return data
  const cards = [...data.cards]
  cards[index] = change(data.cards[index], Date.now())
  return { ...data, cards }
}

function withItem(data: MtfData, cardId: string, itemId: string, change: (item: Item) => Partial<Item>): MtfData {
  return withCard(data, cardId, (card, now) => {
    if (!card.items.some((item) => item.id === itemId)) return card
    return {
      ...card,
      items: card.items.map((item) => (item.id === itemId ? { ...item, ...change(item), updatedAt: now } : item)),
      updatedAt: now,
    }
  })
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
        if (!get().data.cards.some((card) => card.id === cardId)) return undefined
        const id = newId()
        update((data) =>
          withCard(data, cardId, (card, now) => {
            const items = [...card.items]
            const after = items.findIndex((item) => item.id === afterItemId)
            items.splice(after === -1 ? items.length : after + 1, 0, { id, text: '', done: false, createdAt: now, updatedAt: now })
            return { ...card, items, updatedAt: now }
          }),
        )
        return id
      },

      updateItem: (cardId, itemId, text) => update((data) => withItem(data, cardId, itemId, () => ({ text }))),

      toggleItem: (cardId, itemId) => update((data) => withItem(data, cardId, itemId, (item) => ({ done: !item.done }))),

      removeItem: (cardId, itemId) =>
        update((data) =>
          withCard(data, cardId, (card, now) => ({
            ...card,
            items: card.items.filter((item) => item.id !== itemId),
            updatedAt: now,
          })),
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

      deleteCard: (id) => update((data) => ({ ...data, cards: data.cards.filter((card) => card.id !== id) })),

      closeCard: (id) =>
        update((data) => {
          const card = data.cards.find((candidate) => candidate.id === id)
          if (!card) return data
          if (isEmptyCard(card)) return { ...data, cards: data.cards.filter((candidate) => candidate.id !== id) }
          if (card.items.every((item) => item.text.trim() !== '')) return data
          return withCard(data, id, (current, now) => ({
            ...current,
            items: current.items.filter((item) => item.text.trim() !== ''),
            updatedAt: now,
          }))
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
