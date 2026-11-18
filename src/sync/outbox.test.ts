import { describe, expect, it } from 'vitest'
import { makeArea, makeCard, makeData, rowOfAreas } from '../test/fixtures'
import type { WinEvent } from '../types'
import { addPending, confirmSent, diffData, outgoing } from './outbox'

const event: WinEvent = { id: 'e1', type: 'card', at: 5, cardId: 'c1' }
const before = makeData({ areas: rowOfAreas(), cards: [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })], events: [event] })

describe('diffData', () => {
  it('adds nothing for the same reference', () => {
    expect(diffData(before, before, 100)).toEqual({})
  })

  it('adds nothing for an equal Desk from replaceData', () => {
    expect(diffData(before, structuredClone(before), 100)).toEqual({})
  })

  it('records an edited Card, a new Area and an added event at now', () => {
    const after = {
      ...before,
      areas: [...before.areas, makeArea({ id: 'a4' })],
      cards: before.cards.with(0, { ...before.cards[0], title: 'Editada' }),
      events: [...before.events, { id: 'e2', type: 'item' as const, at: 99, cardId: 'c1', itemId: 'i1' }],
    }
    expect(diffData(before, after, 100)).toEqual({ 'card:c1': { at: 100 }, 'area:a4': { at: 100 }, 'win:e2': { at: 100 } })
  })

  it('turns a deleted Card and a removed event into tombstones', () => {
    const after = { ...before, cards: [before.cards[0]], events: [] }
    expect(diffData(before, after, 100)).toEqual({ 'card:c2': { at: 100, deleted: true }, 'win:e1': { at: 100, deleted: true } })
  })
})

describe('addPending', () => {
  it('replaces an older entry with a newer one', () => {
    const pending = addPending({ 'card:c1': { at: 10, deleted: true } }, { 'card:c1': { at: 20 } })
    expect(pending).toEqual({ 'card:c1': { at: 20 } })
  })

  it('keeps a newer entry over an older one', () => {
    expect(addPending({ 'card:c1': { at: 30 } }, { 'card:c1': { at: 20, deleted: true } })).toEqual({ 'card:c1': { at: 30 } })
  })
})

describe('outgoing and confirmSent', () => {
  it('reads what to send from the current document, with the entry time', () => {
    const records = outgoing({ 'card:c1': { at: 40 }, 'card:gone': { at: 41, deleted: true } }, before)
    expect(records).toEqual([
      { kind: 'card', id: 'c1', updatedAt: 40, deleted: false, data: before.cards[0] },
      { kind: 'card', id: 'gone', updatedAt: 41, deleted: true },
    ])
  })

  it('sends a deletion when a changed entity is no longer there', () => {
    expect(outgoing({ 'card:c9': { at: 40 } }, before)).toEqual([{ kind: 'card', id: 'c9', updatedAt: 40, deleted: true }])
  })

  it('removes what the server confirmed', () => {
    const pending = { 'card:c1': { at: 40 }, 'card:c2': { at: 41 } }
    const sent = outgoing({ 'card:c1': { at: 40 } }, before)
    expect(confirmSent(pending, sent)).toEqual({ 'card:c2': { at: 41 } })
  })

  it('leaves an entry changed during the send', () => {
    const sent = outgoing({ 'card:c1': { at: 40 } }, before)
    expect(confirmSent({ 'card:c1': { at: 45 } }, sent)).toEqual({ 'card:c1': { at: 45 } })
  })
})
