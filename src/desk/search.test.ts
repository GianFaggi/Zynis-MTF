import { describe, expect, it } from 'vitest'
import { makeCard, makeItem } from '../test/fixtures'
import { matchesQuery, normalize } from './search'

describe('normalize', () => {
  it('lowercases and removes accents', () => {
    expect(normalize('Canción ÑANDÚ')).toBe('cancion nandu')
  })
})

describe('matchesQuery', () => {
  const card = makeCard({
    id: 'c1',
    title: 'Canción',
    body: 'Para el viernes',
    items: [makeItem({ id: 'i1', text: 'Preparar el mate' })],
  })

  it('ignores case and accents', () => {
    expect(matchesQuery(card, 'cancion')).toBe(true)
    expect(matchesQuery(card, 'CANCIÓN')).toBe(true)
  })

  it('matches the text and the Items', () => {
    expect(matchesQuery(card, 'viernes')).toBe(true)
    expect(matchesQuery(card, 'mate')).toBe(true)
  })

  it('does not match what is not there', () => {
    expect(matchesQuery(card, 'pan')).toBe(false)
  })

  it('an empty or blank query matches nothing', () => {
    expect(matchesQuery(card, '')).toBe(false)
    expect(matchesQuery(card, '   ')).toBe(false)
  })
})
