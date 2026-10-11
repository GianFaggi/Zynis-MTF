import { describe, expect, it } from 'vitest'
import { makeCard, makeItem } from '../test/fixtures'
import { displayTitle, isEmptyCard, isFinished, pendingItems, usableItems } from './cardText'

const items = [makeItem({ id: 'i1', text: 'Pan' }), makeItem({ id: 'i2', text: '  ' }), makeItem({ id: 'i3', text: 'Leche' })]

describe('usableItems', () => {
  it('drops Items without text', () => {
    expect(usableItems(makeCard({ id: 'c1', items })).map((item) => item.id)).toEqual(['i1', 'i3'])
  })
})

describe('isEmptyCard', () => {
  it('is true with no title, no text and only blank Items', () => {
    expect(isEmptyCard(makeCard({ id: 'c1', title: ' ', body: '\n', items: [makeItem({ id: 'i1', text: '' })] }))).toBe(true)
  })

  it.each([
    ['a title', { title: 'Hola' }],
    ['text', { body: 'algo' }],
    ['an Item with text', { items }],
  ])('is false with %s', (_, overrides) => {
    expect(isEmptyCard(makeCard({ id: 'c1', ...overrides }))).toBe(false)
  })
})

describe('isFinished / pendingItems', () => {
  it('a Card with every Item checked is finished, with nothing pending', () => {
    const card = makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan', done: true }), makeItem({ id: 'i2', text: 'Leche', done: true })] })
    expect(isFinished(card)).toBe(true)
    expect(pendingItems(card)).toEqual([])
  })

  it('one unchecked Item is pending and keeps the Card unfinished', () => {
    const card = makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan', done: true }), makeItem({ id: 'i2', text: 'Leche' })] })
    expect(isFinished(card)).toBe(false)
    expect(pendingItems(card).map((item) => item.id)).toEqual(['i2'])
  })

  it('blank Items are ignored', () => {
    const card = makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan', done: true }), makeItem({ id: 'i2', text: ' ' })] })
    expect(isFinished(card)).toBe(true)
    expect(pendingItems(card)).toEqual([])
  })

  it('a Card without Items is not finished and has nothing pending', () => {
    const card = makeCard({ id: 'c1', title: 'Solo texto' })
    expect(isFinished(card)).toBe(false)
    expect(pendingItems(card)).toEqual([])
  })
})

describe('displayTitle', () => {
  it('is the title when there is one', () => {
    expect(displayTitle(makeCard({ id: 'c1', title: 'Viaje', body: 'Salimos el viernes' }))).toBe('Viaje')
  })

  it('falls back to the first line of text', () => {
    expect(displayTitle(makeCard({ id: 'c1', body: '\nLlamar al contador\nantes del 20' }))).toBe('Llamar al contador')
  })

  it('falls back to the Items joined', () => {
    expect(displayTitle(makeCard({ id: 'c1', items }))).toBe('Pan, Leche')
  })
})
