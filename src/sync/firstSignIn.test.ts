import { describe, expect, it } from 'vitest'
import { defaultAreas } from '../desk/areas'
import { en } from '../i18n/locales/en'
import { es } from '../i18n/locales/es'
import { makeArea, makeCard, makeData, makeItem } from '../test/fixtures'
import type { MtfData, SyncRecord } from '../types'
import { deskSummary, firstSignIn, isNewDevice } from './firstSignIn'

function fresh(overrides: Partial<MtfData> = {}): MtfData {
  return makeData({ areas: defaultAreas(1000), ...overrides })
}

function welcome(title: string, done = false) {
  return makeCard({ id: `w-${title}`, title, items: [makeItem({ id: `i-${title}`, text: 'Tildá', done })] })
}

const account: SyncRecord[] = [{ kind: 'card', id: 'r1', updatedAt: 5, deleted: false, data: makeCard({ id: 'r1' }) }]

describe('firstSignIn', () => {
  it('uploads to an empty Account', () => {
    expect(firstSignIn(fresh({ cards: [makeCard({ id: 'c1', title: 'Mía' })] }), [])).toBe('upload')
  })

  it('uploads to an Account holding only deletions', () => {
    expect(firstSignIn(fresh(), [{ kind: 'card', id: 'r1', updatedAt: 5, deleted: true }])).toBe('upload')
  })

  it.each([
    ['the untouched default Areas', fresh()],
    ['a Spanish Welcome Card', fresh({ cards: [welcome(es.welcomeTitle)] })],
    ['an English Welcome Card with checked Items and their Wins', fresh({
      cards: [welcome(en.welcomeTitle, true)],
      events: [{ id: 'e1', type: 'item', at: 3, cardId: `w-${en.welcomeTitle}`, itemId: `i-${en.welcomeTitle}` }],
    })],
  ])('takes the Account on a new device: %s', (_, local) => {
    expect(isNewDevice(local)).toBe(true)
    expect(firstSignIn(local, account)).toBe('take')
  })

  it.each([
    ['a renamed Area', () => { const d = fresh(); d.areas[0] = { ...d.areas[0], name: 'Oficina' }; return d }],
    ['a moved Area', () => { const d = fresh(); d.areas[1] = { ...d.areas[1], rect: { ...d.areas[1].rect, x: 5000 } }; return d }],
    ['a recolored Area', () => { const d = fresh(); d.areas[2] = { ...d.areas[2], color: 'plum' }; return d }],
    ['a fourth Area', () => fresh({ areas: [...defaultAreas(1000), makeArea({ id: 'a4', name: 'Casa' })] })],
    ['a written Card', () => fresh({ cards: [makeCard({ id: 'c1', title: 'Comprar pan' })] })],
    ['a note event', () => fresh({ cards: [welcome(es.welcomeTitle)], events: [{ id: 'n', type: 'note', at: 1, cardId: `w-${es.welcomeTitle}` }] })],
  ])('asks when this device has something of its own: %s', (_, build) => {
    const local = build()
    expect(isNewDevice(local)).toBe(false)
    expect(firstSignIn(local, account)).toBe('ask')
  })
})

describe('deskSummary', () => {
  it('counts Desk and Jar Cards, Areas and the newest change', () => {
    const data = fresh({
      cards: [makeCard({ id: 'c1', updatedAt: 3000 }), makeCard({ id: 'c2', jarredAt: 9, updatedAt: 2000 }), makeCard({ id: 'c3', updatedAt: 10 })],
      events: [{ id: 'e1', type: 'card', at: 4000, cardId: 'c2' }],
    })
    expect(deskSummary(data)).toEqual({ desk: 2, jar: 1, areas: 3, updatedAt: 4000 })
  })

  it('has no last change for an empty document', () => {
    expect(deskSummary(makeData())).toEqual({ desk: 0, jar: 0, areas: 0, updatedAt: null })
  })
})
