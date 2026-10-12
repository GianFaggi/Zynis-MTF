import { describe, expect, it } from 'vitest'
import { makeCard, makeData, makeItem, rowOfAreas } from '../test/fixtures'
import type { MtfData } from '../types'
import { isValidData } from './validate'

function valid(): MtfData {
  return makeData({
    areas: rowOfAreas(),
    cards: [
      makeCard({ id: 'c1', areaId: 'a1', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true })] }),
      makeCard({ id: 'c2', areaId: 'a2', title: 'Viaje', items: [makeItem({ id: 'i2', text: 'Pasajes' })], jarredAt: 9 }),
    ],
    events: [
      { id: 'e1', type: 'item', at: 3, cardId: 'c1', itemId: 'i1', title: 'Pan', areaId: 'a1' },
      { id: 'e2', type: 'card', at: 4, cardId: 'c2' },
      { id: 'e3', type: 'note', at: 5 },
    ],
  })
}

/** `valid()` changed by `change`, which may mutate it freely. */
function broken(change: (doc: MtfData & Record<string, unknown>) => void): unknown {
  const doc = valid() as MtfData & Record<string, unknown>
  change(doc)
  return doc
}

describe('isValidData', () => {
  it('accepts a valid document', () => {
    expect(isValidData(valid())).toBe(true)
  })

  it('accepts extra fields and an event whose Card is gone', () => {
    const doc = broken((doc) => {
      doc.extra = { from: 'the future' }
      Object.assign(doc.cards[0], { color: 'blue' })
      doc.events.push({ id: 'e4', type: 'card', at: 6, cardId: 'deleted' })
    })
    expect(isValidData(doc)).toBe(true)
  })

  it.each<[string, (doc: MtfData & Record<string, unknown>) => void]>([
    ['a Card without an id', (doc) => Reflect.deleteProperty(doc.cards[0], 'id')],
    ['an empty Area id', (doc) => (doc.areas[0].id = '')],
    ['a duplicated Card id', (doc) => (doc.cards[1].id = 'c1')],
    ['a duplicated Area id', (doc) => (doc.areas[1].id = 'a1')],
    ['a duplicated Item id across Cards', (doc) => (doc.cards[1].items[0].id = 'i1')],
    ['a duplicated event id', (doc) => (doc.events[1].id = 'e1')],
    ['an unknown Area color', (doc) => Object.assign(doc.areas[0], { color: 'blue' })],
    ['an unknown Area key', (doc) => Object.assign(doc.areas[0], { key: 'home' })],
    ['an Area name that is not text', (doc) => Object.assign(doc.areas[0], { name: 3 })],
    ['a rect with a missing side', (doc) => Reflect.deleteProperty(doc.areas[0].rect, 'h')],
    ['a rect with no width', (doc) => (doc.areas[0].rect.w = 0)],
    ['a rect with a string coordinate', (doc) => Object.assign(doc.areas[0].rect, { x: '80' })],
    ['an Area without updatedAt', (doc) => Reflect.deleteProperty(doc.areas[0], 'updatedAt')],
    ['a Card in a missing Area', (doc) => (doc.cards[0].areaId = 'gone')],
    ['a Card title that is not text', (doc) => Object.assign(doc.cards[0], { title: null })],
    ['a Card without a body', (doc) => Reflect.deleteProperty(doc.cards[0], 'body')],
    ['pinned as a string', (doc) => Object.assign(doc.cards[0], { pinned: 'false' })],
    ['a position with an infinite coordinate', (doc) => (doc.cards[0].position.z = Infinity)],
    ['jarredAt a string', (doc) => Object.assign(doc.cards[1], { jarredAt: '9' })],
    ['items not a list', (doc) => Object.assign(doc.cards[0], { items: {} })],
    ['an Item that is not an object', (doc) => Object.assign(doc.cards[0], { items: ['Pan'] })],
    ['an Item done as a number', (doc) => Object.assign(doc.cards[0].items[0], { done: 1 })],
    ['an Item without createdAt', (doc) => Reflect.deleteProperty(doc.cards[0].items[0], 'createdAt')],
    ['an unknown event type', (doc) => Object.assign(doc.events[0], { type: 'streak' })],
    ['an event without a time', (doc) => Reflect.deleteProperty(doc.events[0], 'at')],
    ['an event cardId that is not text', (doc) => Object.assign(doc.events[0], { cardId: 7 })],
    ['a null entity', (doc) => Object.assign(doc, { events: [null] })],
    ['no Areas', (doc) => Object.assign(doc, { areas: [], cards: [] })],
  ])('refuses %s', (_, change) => {
    expect(isValidData(broken(change))).toBe(false)
  })

  it('accepts every Area color, the three added in #7 included, and nothing else', () => {
    expect(isValidData(broken((doc) => (doc.areas[0].color = 'teal')))).toBe(true)
    expect(isValidData(broken((doc) => Object.assign(doc.areas[0], { color: 'neon' })))).toBe(false)
  })

  it('refuses something that is not a document', () => {
    expect(isValidData(null)).toBe(false)
    expect(isValidData([])).toBe(false)
    expect(isValidData({ areas: rowOfAreas() })).toBe(false)
  })
})
