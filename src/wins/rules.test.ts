import { describe, expect, it } from 'vitest'
import { makeCard, makeItem } from '../test/fixtures'
import type { Card, WinEvent } from '../types'
import { cardDeleted, cardJarred, hasCardWin, itemToggled, itemsRemoved, jarVerdict, noteWritten, syncCardWin } from './rules'

/** Readable event ids in order: e1, e2… */
function ids() {
  let n = 0
  return () => `e${++n}`
}

function shopping(done: [boolean, boolean]): Card {
  return makeCard({
    id: 'c1',
    title: 'Compras',
    areaId: 'a2',
    items: [makeItem({ id: 'pan', text: 'Pan', done: done[0] }), makeItem({ id: 'leche', text: 'Leche', done: done[1] })],
  })
}

function flip(card: Card, itemId: string): Card {
  return { ...card, items: card.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)) }
}

/** Checks or unchecks an Item the way the store does: flip, then `itemToggled`. */
function toggle(state: { card: Card; events: WinEvent[] }, itemId: string, newId = ids(), now = 100) {
  const card = flip(state.card, itemId)
  return { card, events: itemToggled(state.events, card, itemId, now, newId) }
}

const types = (events: WinEvent[]) => events.map((event) => [event.type, event.itemId ?? event.cardId])

describe('jarVerdict', () => {
  it('accepts a finished Card and a Card without Items', () => {
    expect(jarVerdict(shopping([true, true]))).toEqual({ ok: true })
    expect(jarVerdict(makeCard({ id: 'c2', title: 'Solo texto' }))).toEqual({ ok: true })
  })

  it('refuses a Card with unchecked Items, with how many are left', () => {
    expect(jarVerdict(shopping([false, false]))).toEqual({ ok: false, pending: 2 })
  })
})

describe('itemToggled', () => {
  it('checking appends an Item Win with a title and Area snapshot', () => {
    const { events } = toggle({ card: shopping([false, false]), events: [] }, 'pan')
    expect(events).toEqual([{ id: 'e1', type: 'item', at: 100, cardId: 'c1', itemId: 'pan', title: 'Compras', areaId: 'a2' }])
  })

  it('unchecking removes only the most recent Win for that Item', () => {
    const older: WinEvent = { id: 'old', type: 'item', at: 1, cardId: 'c1', itemId: 'pan' }
    const recent: WinEvent = { id: 'new', type: 'item', at: 2, cardId: 'c1', itemId: 'pan' }
    const other: WinEvent = { id: 'leche', type: 'item', at: 3, cardId: 'c1', itemId: 'leche' }
    const { events } = toggle({ card: shopping([true, false]), events: [older, recent, other] }, 'pan')
    expect(events.map((event) => event.id)).toEqual(['old', 'leche'])
  })

  it('check → uncheck → check leaves exactly one Win', () => {
    const newId = ids()
    let state = { card: shopping([false, false]), events: [] as WinEvent[] }
    state = toggle(state, 'pan', newId)
    state = toggle(state, 'pan', newId)
    state = toggle(state, 'pan', newId)
    expect(types(state.events)).toEqual([['item', 'pan']])
  })

  it('checking the last Item adds the Card Win too', () => {
    const { events } = toggle({ card: shopping([true, false]), events: [] }, 'leche')
    expect(types(events)).toEqual([
      ['item', 'leche'],
      ['card', 'c1'],
    ])
  })

  it('finishing a Card twice counts its Card Win once', () => {
    const newId = ids()
    let state = { card: shopping([true, false]), events: [] as WinEvent[] }
    state = toggle(state, 'leche', newId)
    state = toggle(state, 'leche', newId)
    state = toggle(state, 'leche', newId)
    expect(state.events.filter((event) => event.type === 'card')).toHaveLength(1)
  })

  it('unchecking an Item of a finished Card removes its Item Win and the Card Win', () => {
    const newId = ids()
    let state = { card: shopping([false, false]), events: [] as WinEvent[] }
    state = toggle(state, 'pan', newId)
    state = toggle(state, 'leche', newId)
    state = toggle(state, 'leche', newId)
    expect(types(state.events)).toEqual([['item', 'pan']])
  })

  it('an Item that does not exist changes nothing', () => {
    const events: WinEvent[] = []
    expect(itemToggled(events, shopping([false, false]), 'nope', 100, ids())).toBe(events)
  })
})

describe('syncCardWin', () => {
  const won: WinEvent[] = [
    { id: 'p', type: 'item', at: 1, cardId: 'c1', itemId: 'pan' },
    { id: 'l', type: 'item', at: 1, cardId: 'c1', itemId: 'leche' },
    { id: 'c', type: 'card', at: 1, cardId: 'c1' },
  ]

  it('adding an unchecked Item to a finished Card removes only the Card Win', () => {
    const card = shopping([true, true])
    const grown = { ...card, items: [...card.items, makeItem({ id: 'manteca', text: 'Manteca' })] }
    expect(syncCardWin(won, grown, 100, ids()).map((event) => event.id)).toEqual(['p', 'l'])
  })

  it('removing the last unchecked Item adds the Card Win', () => {
    const card = shopping([true, false])
    const trimmed = { ...card, items: card.items.filter((item) => item.id !== 'leche') }
    expect(types(syncCardWin([], trimmed, 100, ids()))).toEqual([['card', 'c1']])
  })

  it('a returned Card without Items loses its Card Win, a finished one keeps it', () => {
    const jarWin: WinEvent[] = [{ id: 'c', type: 'card', at: 1, cardId: 'c1' }]
    expect(syncCardWin(jarWin, makeCard({ id: 'c1', title: 'Solo texto' }), 100, ids())).toEqual([])
    expect(syncCardWin(won, shopping([true, true]), 100, ids())).toBe(won)
  })

  it('leaves a Card in the Jar alone', () => {
    const jarWin: WinEvent[] = [{ id: 'c', type: 'card', at: 1, cardId: 'c1' }]
    expect(syncCardWin(jarWin, makeCard({ id: 'c1', title: 'Solo texto', jarredAt: 5 }), 100, ids())).toBe(jarWin)
  })
})

describe('itemsRemoved / cardDeleted', () => {
  const events: WinEvent[] = [
    { id: 'p', type: 'item', at: 1, cardId: 'c1', itemId: 'pan' },
    { id: 'l', type: 'item', at: 1, cardId: 'c1', itemId: 'leche' },
    { id: 'c', type: 'card', at: 1, cardId: 'c1' },
    { id: 'n', type: 'note', at: 1, cardId: 'c1' },
    { id: 'x', type: 'item', at: 1, cardId: 'c2', itemId: 'otro' },
    { id: 'y', type: 'note', at: 1, cardId: 'c2' },
  ]

  it('removing a checked Item removes its Win', () => {
    expect(itemsRemoved(events, ['pan']).map((event) => event.id)).toEqual(['l', 'c', 'n', 'x', 'y'])
    expect(itemsRemoved(events, [])).toBe(events)
  })

  it('deleting a Card removes all its item, card and note events and nothing of other Cards', () => {
    expect(cardDeleted(events, 'c1').map((event) => event.id)).toEqual(['x', 'y'])
    expect(cardDeleted(events, 'nope')).toBe(events)
  })
})

describe('cardJarred / noteWritten', () => {
  it('jarring a Card without Items adds its Card Win once', () => {
    const card = makeCard({ id: 'c1', title: 'Llamar al banco' })
    const once = cardJarred([], card, 100, ids())
    expect(types(once)).toEqual([['card', 'c1']])
    expect(hasCardWin(once, 'c1')).toBe(true)
    expect(cardJarred(once, card, 200, ids())).toBe(once)
  })

  it('a note is its own event', () => {
    expect(noteWritten([], makeCard({ id: 'c1', title: 'Idea' }), 100, ids())).toEqual([
      { id: 'e1', type: 'note', at: 100, cardId: 'c1', title: 'Idea', areaId: 'a1' },
    ])
  })
})

describe('purity', () => {
  it('no rule mutates its input', () => {
    const card = shopping([true, true])
    const events: WinEvent[] = [{ id: 'p', type: 'item', at: 1, cardId: 'c1', itemId: 'pan' }]
    const frozen = structuredClone(events)
    const frozenCard = structuredClone(card)

    itemToggled(events, flip(card, 'pan'), 'pan', 100, ids())
    syncCardWin(events, card, 100, ids())
    itemsRemoved(events, ['pan'])
    cardDeleted(events, 'c1')
    cardJarred(events, card, 100, ids())
    noteWritten(events, card, 100, ids())

    expect(events).toEqual(frozen)
    expect(card).toEqual(frozenCard)
  })
})
