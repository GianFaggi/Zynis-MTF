import { describe, expect, it } from 'vitest'
import { makeArea, makeCard, makeData, rowOfAreas, sequence } from '../test/fixtures'
import type { Card, SyncRecord, WinEvent } from '../types'
import { mergeRecords, repairDesk } from './merge'

const card = makeCard({ id: 'c1', title: 'Local', updatedAt: 10 })
const local = makeData({ areas: rowOfAreas(), cards: [card] })

function remote(data: Card, updatedAt = data.updatedAt): SyncRecord {
  return { kind: 'card', id: data.id, updatedAt, deleted: false, data }
}

describe('mergeRecords', () => {
  it('applies a remote change with no pending entry', () => {
    const edited = { ...card, title: 'Del teléfono', updatedAt: 20 }
    const { data, changed } = mergeRecords(local, [remote(edited)], {})
    expect(data.cards).toEqual([edited])
    expect(changed).toBe(true)
  })

  it('adds a Card made on another device', () => {
    const other = makeCard({ id: 'c2', title: 'Nueva' })
    const { data } = mergeRecords(local, [remote(other)], {})
    expect(data.cards.map((c) => c.id)).toEqual(['c1', 'c2'])
  })

  it('keeps the local version when a pending entry is newer', () => {
    const edited = { ...card, title: 'Del teléfono', updatedAt: 20 }
    const { data, changed } = mergeRecords(local, [remote(edited)], { 'card:c1': { at: 30 } })
    expect(data).toBe(local)
    expect(changed).toBe(false)
  })

  it('keeps the local version on an equal time, and reports no change', () => {
    const { data, changed } = mergeRecords(local, [remote({ ...card, title: 'Eco' }, 30)], { 'card:c1': { at: 30 } })
    expect(data).toBe(local)
    expect(changed).toBe(false)
  })

  it('reports no change when a record equals the local one (own change coming back)', () => {
    const { data, changed } = mergeRecords(local, [remote(structuredClone(card))], {})
    expect(data).toBe(local)
    expect(changed).toBe(false)
  })

  it('removes on a remote deletion', () => {
    const { data, changed } = mergeRecords(local, [{ kind: 'card', id: 'c1', updatedAt: 20, deleted: true }], {})
    expect(data.cards).toEqual([])
    expect(changed).toBe(true)
  })

  it('lets a later local edit beat a remote deletion', () => {
    const { data } = mergeRecords(local, [{ kind: 'card', id: 'c1', updatedAt: 20, deleted: true }], { 'card:c1': { at: 25 } })
    expect(data.cards).toEqual([card])
  })

  it('ignores a deletion of something this device never had', () => {
    const { data, changed } = mergeRecords(local, [{ kind: 'area', id: 'zz', updatedAt: 20, deleted: true }], {})
    expect(data).toBe(local)
    expect(changed).toBe(false)
  })

  it('holds the records of the Card being edited, Wins included, and merges the rest', () => {
    const other = makeCard({ id: 'c2' })
    const win: WinEvent = { id: 'e1', type: 'card', at: 20, cardId: 'c1' }
    const incoming: SyncRecord[] = [
      remote({ ...card, title: 'Del teléfono', updatedAt: 20 }),
      { kind: 'win', id: 'e1', updatedAt: 20, deleted: false, data: win },
      remote(other),
    ]
    const { data, held } = mergeRecords(local, incoming, {}, { editingId: 'c1' })
    expect(data.cards).toEqual([card, other])
    expect(held.map((record) => record.id)).toEqual(['c1', 'e1'])
  })

  it('takes the newest of a record that came twice', () => {
    const { data } = mergeRecords(local, [remote({ ...card, title: 'B', updatedAt: 30 }), remote({ ...card, title: 'A', updatedAt: 20 })], {})
    expect(data.cards[0].title).toBe('B')
  })
})

describe('repairDesk', () => {
  it('moves a Card whose Area is gone to the nearest Area', () => {
    const areas = rowOfAreas()
    const orphan = makeCard({ id: 'c1', areaId: 'gone', position: { x: 2300, y: 300 } })
    const jarred = makeCard({ id: 'c2', areaId: 'gone', jarredAt: 5, position: { x: 100, y: 300 } })
    const data = repairDesk(makeData({ areas, cards: [orphan, jarred] }), 99, sequence(0))
    expect(data.cards[0]).toMatchObject({ areaId: 'a3', updatedAt: 99, position: { x: 2200 + 70, y: 120 + 150 } })
    expect(data.cards[1]).toMatchObject({ areaId: 'a1', updatedAt: 99, position: jarred.position })
  })

  it('brings the default Areas back when none is left', () => {
    const data = repairDesk(makeData({ areas: [], cards: [makeCard({ id: 'c1', areaId: 'gone' })] }), 99)
    expect(data.areas.map((area) => area.key)).toEqual(['work', 'life', 'remember'])
    expect(data.areas.map((area) => area.id)).toContain(data.cards[0].areaId)
  })

  it('returns the same document when nothing needs fixing', () => {
    const data = makeData({ areas: [makeArea({ id: 'a1' })], cards: [makeCard({ id: 'c1' })] })
    expect(repairDesk(data, 99)).toBe(data)
  })
})
