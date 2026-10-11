import { afterEach, describe, expect, it, vi } from 'vitest'
import { DATA_KEY, LANGUAGE_KEY } from '../lib/storage'
import { makeArea, makeCard, makeData, makeItem, rowOfAreas } from '../test/fixtures'
import type { MtfData } from '../types'
import { createAppStore } from './appStore'

function browserLanguages(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
}

function storedData(): MtfData {
  return JSON.parse(localStorage.getItem(DATA_KEY)!)
}

/** A store over a stored document with the default row of Areas and the given Cards. */
function storeWith(cards: MtfData['cards'] = [], areas = rowOfAreas()) {
  localStorage.setItem(DATA_KEY, JSON.stringify(makeData({ areas, cards })))
  return createAppStore()
}

function cardIn(store: ReturnType<typeof createAppStore>, id: string) {
  return store.getState().data.cards.find((card) => card.id === id)
}

describe('appStore', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('uses the browser language on first launch', () => {
    browserLanguages(['es-AR'])
    expect(createAppStore().getState().language).toBe('es')
  })

  it('a stored language wins over the browser language', () => {
    browserLanguages(['es-AR'])
    localStorage.setItem(LANGUAGE_KEY, 'en')
    expect(createAppStore().getState().language).toBe('en')
  })

  it('setLanguage changes the language and writes mtf_language', () => {
    browserLanguages(['es-AR'])
    const store = createAppStore()
    store.getState().setLanguage('en')
    expect(store.getState().language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
  })

  it('loads the stored document on create', () => {
    const stored = makeData({ areas: rowOfAreas(), events: [{ id: 'e1', type: 'note', at: 1 }] })
    localStorage.setItem(DATA_KEY, JSON.stringify(stored))
    expect(createAppStore().getState().data).toEqual(stored)
  })

  it('replacing data writes mtf_data', () => {
    const store = createAppStore()
    const next: MtfData = { ...store.getState().data, events: [{ id: 'e1', type: 'note', at: 1 }] }
    store.setState({ data: next })
    expect(storedData()).toEqual(next)
  })

  it('does not write mtf_data when only the language changes', () => {
    const store = createAppStore()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    store.getState().setLanguage('en')
    expect(setItem.mock.calls.map(([key]) => key)).toEqual([LANGUAGE_KEY])
  })
})

describe('default Areas', () => {
  it('are added and saved on a first launch', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(5000)
    const { areas } = createAppStore().getState().data

    expect(areas.map((area) => area.key)).toEqual(['work', 'life', 'remember'])
    expect(areas.every((area) => area.createdAt === 5000 && area.updatedAt === 5000)).toBe(true)
    expect(storedData().areas).toEqual(areas)
  })

  it('are added once: a second store over the same storage keeps the same Areas', () => {
    const first = createAppStore().getState().data.areas
    const second = createAppStore().getState().data.areas
    expect(second).toEqual(first)
  })

  it('leave stored Areas untouched', () => {
    const custom = [makeArea({ id: 'mine', name: 'Facu', color: 'plum' })]
    expect(storeWith([], custom).getState().data.areas).toEqual(custom)
  })
})

describe('Card actions', () => {
  it('createCard adds an empty Card in the Area under the point, on top', () => {
    const store = storeWith([makeCard({ id: 'old', position: { z: 7 } })])
    const id = store.getState().createCard({ x: 1500, y: 600 })!
    const card = cardIn(store, id)!

    expect(card).toMatchObject({ areaId: 'a2', title: '', body: '', items: [], pinned: false, jarredAt: null })
    expect(card.position).toMatchObject({ x: 1500 - 118, y: 560, z: 8 })
    expect(storedData().cards).toHaveLength(2)
  })

  it('updateCard changes the title and text and sets updatedAt', () => {
    const store = storeWith([makeCard({ id: 'c1', updatedAt: 1 })])
    store.getState().updateCard('c1', { title: 'Viaje' })
    store.getState().updateCard('c1', { body: 'Salimos el viernes' })

    expect(cardIn(store, 'c1')).toMatchObject({ title: 'Viaje', body: 'Salimos el viernes' })
    expect(cardIn(store, 'c1')!.updatedAt).toBeGreaterThan(1)
    expect(storedData().cards[0].title).toBe('Viaje')
  })

  it('addItem adds an empty, unchecked Item at the end or right after another, and returns its id', () => {
    const store = storeWith([makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan' }), makeItem({ id: 'i2', text: 'Leche' })] })])
    const last = store.getState().addItem('c1')!
    const between = store.getState().addItem('c1', 'i1')!

    expect(cardIn(store, 'c1')!.items.map((item) => [item.id, item.text, item.done])).toEqual([
      ['i1', 'Pan', false],
      [between, '', false],
      ['i2', 'Leche', false],
      [last, '', false],
    ])
    expect(store.getState().addItem('nope')).toBeUndefined()
  })

  it('updateItem, toggleItem and removeItem change one Item', () => {
    const items = [makeItem({ id: 'i1', text: 'Pan' }), makeItem({ id: 'i2', text: 'Leche' })]
    const store = storeWith([makeCard({ id: 'c1', items })])
    store.getState().updateItem('c1', 'i1', 'Pan lactal')
    store.getState().toggleItem('c1', 'i2')

    expect(cardIn(store, 'c1')!.items.map((item) => [item.text, item.done])).toEqual([
      ['Pan lactal', false],
      ['Leche', true],
    ])
    expect(cardIn(store, 'c1')!.items[1].updatedAt).toBeGreaterThan(1)

    store.getState().toggleItem('c1', 'i2')
    store.getState().removeItem('c1', 'i1')
    expect(cardIn(store, 'c1')!.items.map((item) => [item.text, item.done])).toEqual([['Leche', false]])
  })

  it('togglePin pins and unpins', () => {
    const store = storeWith([makeCard({ id: 'c1' })])
    store.getState().togglePin('c1')
    expect(cardIn(store, 'c1')!.pinned).toBe(true)
    store.getState().togglePin('c1')
    expect(cardIn(store, 'c1')!.pinned).toBe(false)
  })

  it('dropCard moves the Card, takes the Area under its center and raises it above all', () => {
    const store = storeWith([
      makeCard({ id: 'c1', areaId: 'a1', position: { x: 200, y: 300, z: 1 } }),
      makeCard({ id: 'c2', areaId: 'a2', position: { z: 9 } }),
    ])
    // Top-left at (1400, 500) with a 200 px height: the center (1518, 600) is in Vida.
    store.getState().dropCard('c1', { x: 1400, y: 500 }, 200)
    const card = cardIn(store, 'c1')!

    expect(card.areaId).toBe('a2')
    expect(card.position).toMatchObject({ x: 1400, y: 500, z: 10 })
    expect(Math.abs(card.position.tilt)).toBeLessThanOrEqual(2.2)
    expect(storedData().cards[0]).toEqual(card)
  })

  it('dropCard outside every Area joins the nearest one', () => {
    const store = storeWith([makeCard({ id: 'c1', areaId: 'a1' })])
    store.getState().dropCard('c1', { x: 2900, y: 1800 }, 160)
    expect(cardIn(store, 'c1')).toMatchObject({ areaId: 'a3', position: { x: 2900, y: 1800 } })
  })

  it('placeCard moves the Card inside the chosen Area, on top', () => {
    const store = storeWith([makeCard({ id: 'c1', areaId: 'a1', position: { z: 3 } })])
    store.getState().placeCard('c1', 'a3')
    const card = cardIn(store, 'c1')!
    const [, , remember] = rowOfAreas()

    expect(card.areaId).toBe('a3')
    expect(card.position.z).toBe(4)
    expect(card.position.x).toBeGreaterThanOrEqual(remember.rect.x)
    expect(card.position.x).toBeLessThanOrEqual(remember.rect.x + remember.rect.w)
    expect(card.position.y).toBeGreaterThanOrEqual(remember.rect.y)
  })

  it('tidyUp moves Cards inside their own Area and saves the positions', () => {
    const store = storeWith([
      makeCard({ id: 'c1', areaId: 'a1', position: { x: 9000, y: 9000, z: 2 } }),
      makeCard({ id: 'c2', areaId: 'a3', position: { x: -500, y: -500, z: 5 } }),
    ])
    store.getState().tidyUp(new Map())
    const [work, , remember] = rowOfAreas()

    expect(cardIn(store, 'c1')!.areaId).toBe('a1')
    expect(cardIn(store, 'c1')!.position.x).toBeGreaterThan(work.rect.x)
    expect(cardIn(store, 'c2')!.position.x).toBeGreaterThan(remember.rect.x)
    expect(cardIn(store, 'c2')!.position.z).toBe(5)
    expect(storedData().cards.map((card) => card.position)).toEqual(store.getState().data.cards.map((card) => card.position))
  })

  it('deleteCard removes the Card', () => {
    const store = storeWith([makeCard({ id: 'c1' }), makeCard({ id: 'c2' })])
    store.getState().deleteCard('c1')
    expect(storedData().cards.map((card) => card.id)).toEqual(['c2'])
  })

  it('closeCard removes a Card left empty', () => {
    const store = storeWith([makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: ' ' })] })])
    store.getState().closeCard('c1')
    expect(storedData().cards).toEqual([])
  })

  it('closeCard drops blank Items and keeps the rest', () => {
    const items = [makeItem({ id: 'i1', text: 'Pan' }), makeItem({ id: 'i2', text: '' })]
    const store = storeWith([makeCard({ id: 'c1', items })])
    store.getState().closeCard('c1')
    expect(storedData().cards[0].items.map((item) => item.id)).toEqual(['i1'])
  })

  it('closeCard leaves a complete Card untouched', () => {
    const card = makeCard({ id: 'c1', title: 'Hola' })
    const store = storeWith([card])
    const before = store.getState().data
    store.getState().closeCard('c1')
    expect(store.getState().data).toBe(before)
  })

  it('actions on a Card that does not exist change nothing', () => {
    const store = storeWith()
    const before = store.getState().data
    store.getState().updateCard('nope', { title: 'x' })
    store.getState().toggleItem('nope', 'i1')
    store.getState().dropCard('nope', { x: 0, y: 0 })
    store.getState().placeCard('nope', 'a1')
    store.getState().closeCard('nope')
    expect(store.getState().data).toBe(before)
  })
})
