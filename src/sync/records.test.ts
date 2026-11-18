import { describe, expect, it } from 'vitest'
import { makeCard, makeData, makeItem, rowOfAreas } from '../test/fixtures'
import type { WinEvent } from '../types'
import { canonicalOrder, fromRecords, keyOf, parseKey, sameValue, toRecords } from './records'

const event: WinEvent = { id: 'e1', type: 'item', at: 50, cardId: 'c1', itemId: 'i1', title: 'Compras', areaId: 'a1' }

const desk = makeData({
  areas: rowOfAreas(),
  cards: [
    makeCard({ id: 'c1', title: 'Compras', updatedAt: 40, items: [makeItem({ id: 'i1', text: 'Pan', done: true })] }),
    makeCard({ id: 'c2', areaId: 'a2', jarredAt: 60, updatedAt: 60 }),
  ],
  events: [event],
})

describe('records', () => {
  it('a round trip returns an equal document', () => {
    expect(fromRecords(toRecords(desk), desk.schemaVersion)).toEqual(desk)
  })

  it('carries Items inside their Card, and Win events as kind win', () => {
    const records = toRecords(desk)
    expect(records.map((record) => record.kind)).toEqual(['area', 'area', 'area', 'card', 'card', 'win'])
    expect(records.find((record) => record.id === 'c1')?.data).toMatchObject({ items: [{ id: 'i1', text: 'Pan' }] })
    expect(records.some((record) => record.id === 'i1')).toBe(false)
  })

  it('sends each entity with its own change time; a Win event with its moment', () => {
    const records = toRecords(desk)
    expect(records.find((record) => record.id === 'c2')?.updatedAt).toBe(60)
    expect(records.find((record) => record.id === 'e1')?.updatedAt).toBe(50)
  })

  it('skips deletions when building a document', () => {
    const data = fromRecords([...toRecords(desk), { kind: 'card', id: 'gone', updatedAt: 1, deleted: true }], 1)
    expect(data.cards.map((card) => card.id)).toEqual(['c1', 'c2'])
  })

  it('keys records by kind and id', () => {
    expect(keyOf('card', 'c1')).toBe('card:c1')
    expect(parseKey('win:e-1:x')).toEqual({ kind: 'win', id: 'e-1:x' })
  })

  it('orders a Desk from the server the same way on every device', () => {
    const shuffled = { ...desk, areas: desk.areas.toReversed(), events: [{ ...event, id: 'e2', at: 10 }, event] }
    const ordered = canonicalOrder(shuffled)
    expect(ordered.areas.map((area) => area.id)).toEqual(['a1', 'a2', 'a3'])
    expect(ordered.events.map((e) => e.id)).toEqual(['e2', 'e1'])
  })

  it('compares plain values by content, ignoring absent fields', () => {
    expect(sameValue({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true)
    expect(sameValue({ a: 1, b: undefined }, { a: 1 })).toBe(true)
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false)
    expect(sameValue([1, 2], [1, 2, 3])).toBe(false)
  })
})
