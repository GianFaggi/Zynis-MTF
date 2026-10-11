import { SCHEMA_VERSION } from '../lib/storage'
import type { Area, Card, Item, MtfData } from '../types'

// Small builders for test data. Ids are readable on purpose ("a1", "c1"), so a
// failing assertion says which entity it is about.

export function makeArea(overrides: Partial<Area> & Pick<Area, 'id'>): Area {
  return {
    color: 'sage',
    rect: { x: 0, y: 0, w: 980, h: 1000 },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

/** The three default Areas with the mockup's rects, under readable ids. */
export function rowOfAreas(): Area[] {
  return [
    makeArea({ id: 'a1', key: 'work', color: 'sage', rect: { x: 80, y: 120, w: 980, h: 1000 } }),
    makeArea({ id: 'a2', key: 'life', color: 'sand', rect: { x: 1140, y: 120, w: 980, h: 1000 } }),
    makeArea({ id: 'a3', key: 'remember', color: 'sky', rect: { x: 2200, y: 120, w: 980, h: 1000 } }),
  ]
}

export function makeItem(overrides: Partial<Item> & Pick<Item, 'id'>): Item {
  return { text: '', done: false, createdAt: 1, updatedAt: 1, ...overrides }
}

export function makeCard(overrides: Partial<Omit<Card, 'position'>> & Pick<Card, 'id'> & { position?: Partial<Card['position']> }): Card {
  const { position, ...rest } = overrides
  return {
    areaId: 'a1',
    title: '',
    body: '',
    items: [],
    pinned: false,
    jarredAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...rest,
    position: { x: 0, y: 0, tilt: 0, z: 0, ...position },
  }
}

export function makeData(overrides: Partial<MtfData> = {}): MtfData {
  return { schemaVersion: SCHEMA_VERSION, areas: [], cards: [], events: [], ...overrides }
}

/** A `random` that returns the given values in turn, forever. */
export function sequence(...values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length]
}
