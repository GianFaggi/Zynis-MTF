import { describe, expect, it } from 'vitest'
import { makeCard, makeData, makeItem, rowOfAreas } from '../test/fixtures'
import type { Card, MtfData, WinEvent } from '../types'
import { normalizeWins } from './normalize'

function ids() {
  let n = 0
  return () => `new${++n}`
}

const finished = makeCard({ id: 'c1', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true })] })
const unfinished = makeCard({ id: 'c2', items: [makeItem({ id: 'i2', text: 'Leche', done: false })] })
const jarred = makeCard({ id: 'c3', jarredAt: 5 })

const cardWin = (id: string, cardId: string, at: number): WinEvent => ({ id, type: 'card', at, cardId })
const itemWin = (id: string, cardId: string, itemId: string, at: number): WinEvent => ({ id, type: 'item', at, cardId, itemId })

function desk(cards: Card[], events: WinEvent[]): MtfData {
  return makeData({ areas: rowOfAreas(), cards, events })
}

describe('normalizeWins', () => {
  it('keeps the earliest of two Card Wins, the same on both devices whatever their order', () => {
    const phone = cardWin('b', 'c1', 10)
    const pc = cardWin('a', 'c1', 20)
    const item = itemWin('i', 'c1', 'i1', 5)
    const onPhone = normalizeWins(desk([finished], [item, phone, pc]), 99, ids())
    const onPc = normalizeWins(desk([finished], [item, pc, phone]), 99, ids())
    expect(onPhone.events.map((e) => e.id)).toEqual(['i', 'b'])
    expect(onPc.events.map((e) => e.id)).toEqual(['i', 'b'])
  })

  it('breaks a tie by the smallest id', () => {
    const data = normalizeWins(desk([finished], [cardWin('z', 'c1', 10), cardWin('m', 'c1', 10), itemWin('i', 'c1', 'i1', 1)]), 99, ids())
    expect(data.events.filter((e) => e.type === 'card').map((e) => e.id)).toEqual(['m'])
  })

  it('gives a finished Card with no Card Win one, at now', () => {
    const data = normalizeWins(desk([finished], [itemWin('i', 'c1', 'i1', 1)]), 99, ids())
    expect(data.events.at(-1)).toMatchObject({ id: 'new1', type: 'card', at: 99, cardId: 'c1' })
  })

  it('takes the Card Win from an unfinished Desk Card', () => {
    const data = normalizeWins(desk([unfinished], [cardWin('w', 'c2', 10)]), 99, ids())
    expect(data.events).toEqual([])
  })

  it('keeps exactly one Card Win for a Card in the Jar', () => {
    expect(normalizeWins(desk([jarred], []), 99, ids()).events).toMatchObject([{ type: 'card', cardId: 'c3' }])
    expect(normalizeWins(desk([jarred], [cardWin('x', 'c3', 3), cardWin('y', 'c3', 4)]), 99, ids()).events.map((e) => e.id)).toEqual(['x'])
  })

  it('keeps one of duplicate Item Wins', () => {
    const data = normalizeWins(desk([finished], [itemWin('i2', 'c1', 'i1', 20), itemWin('i1', 'c1', 'i1', 10), cardWin('w', 'c1', 1)]), 99, ids())
    expect(data.events.map((e) => e.id)).toEqual(['i1', 'w'])
  })

  it('removes the Item Win of an unchecked Item', () => {
    const data = normalizeWins(desk([unfinished], [itemWin('i', 'c2', 'i2', 10)]), 99, ids())
    expect(data.events).toEqual([])
  })

  it('removes the Wins of a gone Card or Item', () => {
    const data = normalizeWins(
      desk([unfinished], [cardWin('w', 'gone', 1), itemWin('i', 'gone', 'gone-item', 1), { id: 'n', type: 'note', at: 1, cardId: 'gone' }]),
      99,
      ids(),
    )
    expect(data.events).toEqual([])
  })

  it('never adds an Item Win', () => {
    const data = normalizeWins(desk([finished], [cardWin('w', 'c1', 1)]), 99, ids())
    expect(data.events.map((e) => e.id)).toEqual(['w'])
  })

  it('never removes a Win for its age', () => {
    const old = desk([finished], [itemWin('i', 'c1', 'i1', 1), cardWin('w', 'c1', 1), { id: 'n', type: 'note', at: 1, cardId: 'c1' }])
    expect(normalizeWins(old, 10_000_000_000_000, ids())).toBe(old)
  })

  it('returns the same document when everything already agrees', () => {
    const data = desk([finished, unfinished], [itemWin('i', 'c1', 'i1', 1), cardWin('w', 'c1', 2)])
    expect(normalizeWins(data, 99, ids())).toBe(data)
  })
})
