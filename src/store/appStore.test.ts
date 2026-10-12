import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARD_WIDTH } from '../desk/geometry'
import { DATA_KEY, LANGUAGE_KEY, THEME_KEY } from '../lib/storage'
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

  it('the theme is System until one is chosen', () => {
    expect(createAppStore().getState().theme).toBe('system')
  })

  it('uses a stored theme', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    expect(createAppStore().getState().theme).toBe('dark')
  })

  it('setTheme changes the theme and writes only mtf_theme', () => {
    const store = createAppStore()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    store.getState().setTheme('light')
    expect(store.getState().theme).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(setItem.mock.calls.map(([key]) => key)).toEqual([THEME_KEY])
  })

  it('replaceData puts the imported document in place, saves it and keeps the language and the theme', () => {
    browserLanguages(['es-AR'])
    const store = storeWith([makeCard({ id: 'mine', title: 'Solo acá' })])
    store.getState().setLanguage('en')
    store.getState().setTheme('dark')
    const imported = makeData({
      areas: [makeArea({ id: 'x1', key: 'work' })],
      cards: [makeCard({ id: 'theirs', areaId: 'x1', title: 'De la copia', jarredAt: 7 })],
      events: [{ id: 'e1', type: 'card', at: 7, cardId: 'theirs' }],
    })

    store.getState().replaceData(imported)

    expect(store.getState().data).toBe(imported)
    expect(storedData()).toEqual(imported)
    expect(store.getState().language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
    expect(store.getState().theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
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
    store.getState().deleteCard('nope')
    expect(store.getState().data).toBe(before)
  })
})

describe('Win events', () => {
  const shopping = (done: [boolean, boolean]) =>
    makeCard({
      id: 'c1',
      areaId: 'a2',
      title: 'Compras',
      items: [makeItem({ id: 'pan', text: 'Pan', done: done[0] }), makeItem({ id: 'leche', text: 'Leche', done: done[1] })],
    })

  const kinds = (store: ReturnType<typeof createAppStore>) =>
    store.getState().data.events.map((event) => [event.type, event.itemId ?? event.cardId])

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toggleItem says what happened and writes the events with the Item, in one save', () => {
    const store = storeWith([shopping([false, false])])
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    expect(store.getState().toggleItem('c1', 'pan')).toBe('checked')
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(store.getState().toggleItem('c1', 'leche')).toBe('finished')
    expect(kinds(store)).toEqual([
      ['item', 'pan'],
      ['item', 'leche'],
      ['card', 'c1'],
    ])
    expect(storedData().events).toEqual(store.getState().data.events)
    expect(storedData().cards[0].items.every((item) => item.done)).toBe(true)

    expect(store.getState().toggleItem('c1', 'leche')).toBe('unchecked')
    expect(kinds(store)).toEqual([['item', 'pan']])
    expect(store.getState().toggleItem('c1', 'nope')).toBeUndefined()
  })

  it('checking a blank Item of a finished Card is not a new finish', () => {
    const card = shopping([true, true])
    const store = storeWith([{ ...card, items: [...card.items, makeItem({ id: 'blank', text: '' })] }])
    expect(store.getState().toggleItem('c1', 'blank')).toBe('checked')
  })

  it('closeCard counts a note only for a kept new Card', () => {
    const store = storeWith([makeCard({ id: 'new', title: 'Idea' }), makeCard({ id: 'old', title: 'Viaje' })])
    const empty = store.getState().createCard({ x: 500, y: 500 })!

    store.getState().closeCard(empty, { isNew: true })
    store.getState().closeCard('old')
    expect(store.getState().data.events).toEqual([])

    store.getState().closeCard('new', { isNew: true })
    expect(kinds(store)).toEqual([['note', 'new']])
    expect(storedData().events).toHaveLength(1)
  })

  it('closeCard drops a checked blank Item together with its Win, and the Card Win follows', () => {
    const card = makeCard({ id: 'c1', items: [makeItem({ id: 'pan', text: 'Pan' }), makeItem({ id: 'blank', text: ' ', done: true })] })
    const store = storeWith([card])
    store.setState({ data: { ...store.getState().data, events: [{ id: 'e', type: 'item', at: 1, cardId: 'c1', itemId: 'blank' }] } })
    store.getState().toggleItem('c1', 'pan')
    expect(kinds(store)).toEqual([
      ['item', 'blank'],
      ['item', 'pan'],
      ['card', 'c1'],
    ])

    store.getState().closeCard('c1')
    expect(kinds(store)).toEqual([
      ['item', 'pan'],
      ['card', 'c1'],
    ])
  })

  it('typing a new Item on a finished Card removes the Card Win; clearing it brings it back', () => {
    const store = storeWith([shopping([false, false])])
    store.getState().toggleItem('c1', 'pan')
    store.getState().toggleItem('c1', 'leche')
    const manteca = store.getState().addItem('c1')!
    expect(kinds(store)).toContainEqual(['card', 'c1']) // a blank Item is not part of the Card yet

    store.getState().updateItem('c1', manteca, 'M')
    expect(kinds(store)).toEqual([
      ['item', 'pan'],
      ['item', 'leche'],
    ])
    store.getState().updateItem('c1', manteca, '')
    expect(kinds(store).filter(([type]) => type === 'card')).toHaveLength(1)
  })

  it('removing a checked Item removes its Win; removing the last unchecked one finishes the Card', () => {
    const store = storeWith([shopping([false, false])])
    store.getState().toggleItem('c1', 'pan')
    store.getState().removeItem('c1', 'leche')
    expect(kinds(store)).toEqual([
      ['item', 'pan'],
      ['card', 'c1'],
    ])

    store.getState().removeItem('c1', 'pan')
    expect(kinds(store)).toEqual([])
  })

  it('deleteCard removes the Card and every event of it, and nothing else', () => {
    const store = storeWith([shopping([false, false]), makeCard({ id: 'c2', items: [makeItem({ id: 'x', text: 'Otro' })] })])
    store.getState().toggleItem('c1', 'pan')
    store.getState().toggleItem('c1', 'leche')
    store.getState().toggleItem('c2', 'x')
    store.getState().deleteCard('c1')

    expect(kinds(store)).toEqual([
      ['item', 'x'],
      ['card', 'c2'],
    ])
    expect(storedData().events).toEqual(store.getState().data.events)
  })
})

describe('The Jar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('jarCard refuses a Card with unchecked Items and writes nothing', () => {
    const store = storeWith([makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan' }), makeItem({ id: 'i2', text: 'Leche' })] })])
    const before = store.getState().data
    expect(store.getState().jarCard('c1')).toEqual({ ok: false, pending: 2 })
    expect(store.getState().data).toBe(before)
  })

  it('jarCard refuses a missing, an empty or an already jarred Card', () => {
    const store = storeWith([makeCard({ id: 'empty' }), makeCard({ id: 'in', title: 'Ya está', jarredAt: 5 })])
    const before = store.getState().data
    for (const id of ['nope', 'empty', 'in']) expect(store.getState().jarCard(id).ok).toBe(false)
    expect(store.getState().data).toBe(before)
  })

  it('jarCard takes a finished Card without a second Card Win', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(9000)
    const store = storeWith([makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan' })] })])
    store.getState().toggleItem('c1', 'i1')
    expect(store.getState().jarCard('c1')).toEqual({ ok: true })

    expect(cardIn(store, 'c1')).toMatchObject({ jarredAt: 9000, updatedAt: 9000 })
    expect(store.getState().data.events.filter((event) => event.type === 'card')).toHaveLength(1)
    expect(storedData().cards[0].jarredAt).toBe(9000)
  })

  it('jarCard gives a Card without Items its Card Win', () => {
    const store = storeWith([makeCard({ id: 'c1', title: 'Llamar al banco' })])
    store.getState().jarCard('c1')
    expect(store.getState().data.events.map((event) => [event.type, event.cardId])).toEqual([['card', 'c1']])
  })

  it('returnCard puts the Card inside its Area, on top; a finished Card keeps its Card Win', () => {
    const store = storeWith([
      makeCard({ id: 'c1', areaId: 'a2', items: [makeItem({ id: 'i1', text: 'Pan' })], position: { x: 9000, y: 9000, z: 1 } }),
      makeCard({ id: 'c2', areaId: 'a2', title: 'Arriba', position: { z: 12 } }),
    ])
    store.getState().toggleItem('c1', 'i1')
    store.getState().jarCard('c1')
    store.getState().returnCard('c1')
    const card = cardIn(store, 'c1')!
    const [, life] = rowOfAreas()

    expect(card).toMatchObject({ areaId: 'a2', jarredAt: null })
    expect(card.position.z).toBe(13)
    expect(card.position.x).toBeGreaterThanOrEqual(life.rect.x)
    expect(card.position.x).toBeLessThanOrEqual(life.rect.x + life.rect.w)
    expect(card.position.y).toBeGreaterThanOrEqual(life.rect.y)
    expect(card.position.y).toBeLessThanOrEqual(life.rect.y + life.rect.h)
    expect(store.getState().data.events.filter((event) => event.type === 'card')).toHaveLength(1)
  })

  it('returnCard takes the Card Win back from a Card without Items', () => {
    const store = storeWith([makeCard({ id: 'c1', title: 'Llamar al banco' })])
    store.getState().jarCard('c1')
    store.getState().returnCard('c1')
    expect(store.getState().data.events).toEqual([])
  })

  it('returnCard falls back to the nearest Area when its own is gone', () => {
    const store = storeWith([makeCard({ id: 'c1', areaId: 'gone', title: 'Huérfana', jarredAt: 5, position: { x: 2400, y: 500 } })])
    store.getState().returnCard('c1')
    expect(cardIn(store, 'c1')).toMatchObject({ areaId: 'a3', jarredAt: null })
  })

  it('returnCard ignores a Card on the Desk', () => {
    const store = storeWith([makeCard({ id: 'c1', title: 'Acá' })])
    const before = store.getState().data
    store.getState().returnCard('c1')
    expect(store.getState().data).toBe(before)
  })
})

describe('Area actions', () => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  function areaIn(store: ReturnType<typeof createAppStore>, id: string) {
    return store.getState().data.areas.find((area) => area.id === id)
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('createArea adds a named Area in the free slot and the next color, and it survives a reload', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(7000)
    const store = storeWith()

    const id = store.getState().createArea('Área nueva')

    expect(id).toMatch(uuid)
    expect(areaIn(store, id)).toEqual({
      id,
      name: 'Área nueva',
      color: 'plum',
      rect: { x: 80, y: 1280, w: 980, h: 1000 },
      createdAt: 7000,
      updatedAt: 7000,
    })
    expect(store.getState().data.areas.map((area) => area.id)).toEqual(['a1', 'a2', 'a3', id])
    expect(areaIn(createAppStore(), id)).toEqual(areaIn(store, id))
  })

  it('renameArea stores the trimmed name of any Area, the default ones included', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(7000)
    const store = storeWith()
    store.getState().renameArea('a1', '  Oficina ')
    expect(areaIn(store, 'a1')).toMatchObject({ key: 'work', name: 'Oficina', updatedAt: 7000 })
    expect(storedData().areas[0].name).toBe('Oficina')
  })

  it('renaming a default Area to nothing removes its name, so its key shows again', () => {
    const [work, ...others] = rowOfAreas()
    const store = storeWith([], [{ ...work, name: 'Oficina' }, ...others])
    store.getState().renameArea('a1', '')
    expect(areaIn(store, 'a1')).not.toHaveProperty('name')
    expect(areaIn(store, 'a1')?.key).toBe('work')
  })

  it('renaming a custom Area to blanks keeps its name and writes nothing', () => {
    const store = storeWith([], [...rowOfAreas(), makeArea({ id: 'a4', name: 'Facu' })])
    const before = store.getState().data
    store.getState().renameArea('a4', '   ')
    expect(store.getState().data).toBe(before)
    expect(areaIn(store, 'a4')?.name).toBe('Facu')
  })

  it('recolorArea changes only the color and updatedAt', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(7000)
    const store = storeWith([makeCard({ id: 'c1', areaId: 'a2' })])
    const before = store.getState().data
    store.getState().recolorArea('a2', 'teal')

    expect(areaIn(store, 'a2')).toEqual({ ...before.areas[1], color: 'teal', updatedAt: 7000 })
    expect(store.getState().data.cards).toBe(before.cards)
    expect(storedData().areas[1].color).toBe('teal')
  })

  it('moveArea shifts the Area and only its Desk Cards, by the rounded amount, keeping tilt and z', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(7000)
    const store = storeWith([
      makeCard({ id: 'mine', areaId: 'a3', position: { x: 2300, y: 400, tilt: 1.5, z: 4 } }),
      makeCard({ id: 'jarred', areaId: 'a3', jarredAt: 3, position: { x: 2300, y: 400, tilt: 1, z: 2 } }),
      makeCard({ id: 'other', areaId: 'a2', position: { x: 2300, y: 400, tilt: 0, z: 3 } }),
    ])

    store.getState().moveArea('a3', 600.4, -99.6)

    expect(areaIn(store, 'a3')).toMatchObject({ rect: { x: 2800, y: 20, w: 980, h: 1000 }, updatedAt: 7000 })
    expect(cardIn(store, 'mine')).toMatchObject({ areaId: 'a3', position: { x: 2900, y: 300, tilt: 1.5, z: 4 }, updatedAt: 7000 })
    expect(cardIn(store, 'jarred')).toMatchObject({ position: { x: 2300, y: 400 }, updatedAt: 1 })
    expect(cardIn(store, 'other')).toMatchObject({ areaId: 'a2', position: { x: 2300, y: 400 }, updatedAt: 1 })
    expect(storedData().areas[2].rect.x).toBe(2800)
  })

  it('a move of less than half a px writes nothing', () => {
    const store = storeWith([makeCard({ id: 'c1', areaId: 'a1' })])
    const before = store.getState().data
    store.getState().moveArea('a1', 0, 0)
    store.getState().moveArea('a1', 0.3, -0.4)
    expect(store.getState().data).toBe(before)
  })

  it('resizeArea writes the new rect and moves no Card', () => {
    const store = storeWith([makeCard({ id: 'c1', areaId: 'a2', position: { x: 1500, y: 500 } })])
    const cards = store.getState().data.cards
    store.getState().resizeArea('a2', { x: 1140, y: 120, w: 1380, h: 1300 })
    expect(areaIn(store, 'a2')?.rect).toEqual({ x: 1140, y: 120, w: 1380, h: 1300 })
    expect(store.getState().data.cards).toBe(cards)
    expect(storedData().areas[1].rect.w).toBe(1380)
  })

  describe('deleteArea', () => {
    const vida = [
      makeCard({ id: 'top', areaId: 'a2', position: { x: 1200, y: 300, z: 9 } }),
      makeCard({ id: 'bottom', areaId: 'a2', position: { x: 1300, y: 300, z: 2 } }),
      makeCard({ id: 'jarred', areaId: 'a2', jarredAt: 5, position: { x: 1400, y: 300, z: 1 } }),
      makeCard({ id: 'work', areaId: 'a1', position: { x: 200, y: 300, z: 11 } }),
    ]

    it('moves the Desk Cards inside the destination, on top, in their old order', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(7000)
      const store = storeWith(vida)
      const events = store.getState().data.events
      store.getState().deleteArea('a2', 'a1')
      const [work] = rowOfAreas()

      expect(store.getState().data.areas.map((area) => area.id)).toEqual(['a1', 'a3'])
      for (const id of ['top', 'bottom']) {
        const card = cardIn(store, id)!
        expect(card).toMatchObject({ areaId: 'a1', jarredAt: null, updatedAt: 7000 })
        expect(card.position.x).toBeGreaterThanOrEqual(work.rect.x + 70)
        expect(card.position.x + CARD_WIDTH).toBeLessThanOrEqual(work.rect.x + work.rect.w - 70)
        expect(card.position.y).toBeGreaterThanOrEqual(work.rect.y + 150)
        expect(card.position.y).toBeLessThanOrEqual(work.rect.y + 420)
      }
      expect(cardIn(store, 'bottom')!.position.z).toBe(12)
      expect(cardIn(store, 'top')!.position.z).toBe(13)
      expect(store.getState().data.events).toBe(events)
      expect(storedData().areas).toHaveLength(2)
    })

    it('gives the Cards in the Jar the destination Area and nothing else', () => {
      const store = storeWith(vida)
      store.getState().deleteArea('a2', 'a3')
      expect(cardIn(store, 'jarred')).toMatchObject({ areaId: 'a3', jarredAt: 5, position: { x: 1400, y: 300, z: 1 } })
      expect(cardIn(store, 'work')).toEqual(vida[3])
    })

    it('writes nothing for the last Area, a missing destination or the Area itself', () => {
      const store = storeWith(vida)
      const before = store.getState().data
      store.getState().deleteArea('a2', 'gone')
      store.getState().deleteArea('a2', 'a2')
      store.getState().deleteArea('gone', 'a1')
      expect(store.getState().data).toBe(before)

      const [work] = rowOfAreas()
      const single = storeWith([], [work])
      const alone = single.getState().data
      single.getState().deleteArea('a1', 'a1')
      expect(single.getState().data).toBe(alone)
    })
  })
})
