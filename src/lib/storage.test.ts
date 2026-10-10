import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MtfData } from '../types'
import {
  DATA_KEY,
  LANGUAGE_KEY,
  RECOVERY_KEY_PREFIX,
  SCHEMA_VERSION,
  emptyData,
  loadData,
  loadLanguage,
  migrate,
  saveData,
  saveLanguage,
} from './storage'

const sample: MtfData = {
  schemaVersion: SCHEMA_VERSION,
  areas: [
    {
      id: 'a1',
      key: 'work',
      color: 'sage',
      rect: { x: 80, y: 120, w: 980, h: 1000 },
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  cards: [
    {
      id: 'c1',
      areaId: 'a1',
      title: 'Viaje a Córdoba',
      body: 'Llevar abrigo',
      items: [{ id: 'i1', text: 'Pasajes', done: true, createdAt: 1, updatedAt: 3 }],
      pinned: false,
      position: { x: 100, y: 200, tilt: -1.5, z: 1 },
      jarredAt: null,
      createdAt: 1,
      updatedAt: 3,
    },
  ],
  events: [{ id: 'e1', type: 'item', at: 3, cardId: 'c1', itemId: 'i1', title: 'Pasajes', areaId: 'a1' }],
}

function recoveryEntries() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(RECOVERY_KEY_PREFIX))
    .map((key) => ({ key, value: localStorage.getItem(key) }))
}

describe('storage', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts from an empty current-version document when nothing is stored', () => {
    expect(loadData()).toEqual({ schemaVersion: SCHEMA_VERSION, areas: [], cards: [], events: [] })
    expect(warn).not.toHaveBeenCalled()
  })

  it('reads back exactly what it saved', () => {
    saveData(sample)
    expect(JSON.parse(localStorage.getItem(DATA_KEY)!)).toEqual(sample)
    expect(loadData()).toEqual(sample)
  })

  it('loads a current-version document unchanged and makes no recovery copy', () => {
    localStorage.setItem(DATA_KEY, JSON.stringify(sample))
    expect(loadData()).toEqual(sample)
    expect(recoveryEntries()).toEqual([])
  })

  it('keeps invalid JSON in a recovery key and starts empty', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_760_000_000_000)
    localStorage.setItem(DATA_KEY, '{not json')

    expect(loadData()).toEqual(emptyData())
    expect(recoveryEntries()).toEqual([{ key: 'mtf_data_recovery_1760000000000', value: '{not json' }])
    expect(localStorage.getItem(DATA_KEY)).toBe('{not json')
    vi.useRealTimers()
  })

  it.each([
    ['an array', '[]'],
    ['a string', '"hola"'],
    ['null', 'null'],
    ['no schemaVersion', JSON.stringify({ areas: [], cards: [], events: [] })],
    ['a non-number schemaVersion', JSON.stringify({ ...sample, schemaVersion: '1' })],
    ['cards not a list', JSON.stringify({ ...sample, cards: {} })],
    ['events missing', JSON.stringify({ schemaVersion: 1, areas: [], cards: [] })],
  ])('keeps a document with the wrong shape (%s) in a recovery key', (_, raw) => {
    localStorage.setItem(DATA_KEY, raw)
    expect(loadData()).toEqual(emptyData())
    expect(recoveryEntries().map((entry) => entry.value)).toEqual([raw])
  })

  it('keeps a document from a newer schema version in a recovery key', () => {
    const raw = JSON.stringify({ ...sample, schemaVersion: SCHEMA_VERSION + 1 })
    localStorage.setItem(DATA_KEY, raw)
    expect(loadData()).toEqual(emptyData())
    expect(recoveryEntries().map((entry) => entry.value)).toEqual([raw])
  })

  it('does not throw when localStorage refuses to read or write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    expect(loadData()).toEqual(emptyData())
    expect(loadLanguage()).toBeNull()
    expect(() => saveData(sample)).not.toThrow()
    expect(() => saveLanguage('en')).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('stores and reads the language', () => {
    expect(loadLanguage()).toBeNull()
    saveLanguage('en')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
    expect(loadLanguage()).toBe('en')
  })

  it('ignores an unknown stored language', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr')
    expect(loadLanguage()).toBeNull()
  })
})

describe('migrate', () => {
  const steps = {
    1: (doc: Record<string, unknown>) => ({ ...doc, renamed: doc.old, old: undefined }),
    2: (doc: Record<string, unknown>) => ({ ...doc, added: true }),
  }

  it('runs every step from the stored version up to the target, in order', () => {
    const result = migrate({ schemaVersion: 1, old: 'x', areas: [], cards: [], events: [] }, steps, 3)
    expect(result).toMatchObject({ schemaVersion: 3, renamed: 'x', added: true })
  })

  it('leaves a document already at the target untouched', () => {
    const doc = { schemaVersion: 3, areas: [] }
    expect(migrate(doc, steps, 3)).toBe(doc)
  })

  it('throws when a step is missing, so loadData can keep a recovery copy', () => {
    expect(() => migrate({ schemaVersion: 1 }, {}, 2)).toThrow(/no migration from schema version 1/)
  })
})
