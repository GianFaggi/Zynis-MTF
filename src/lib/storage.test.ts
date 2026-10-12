import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MtfData } from '../types'
import {
  DATA_KEY,
  HINT_SEEN_KEY,
  INSTALL_NUDGE_SEEN_KEY,
  LANGUAGE_KEY,
  RECOVERY_KEY_PREFIX,
  SCHEMA_VERSION,
  THEME_KEY,
  emptyData,
  loadData,
  loadHintSeen,
  loadInstallNudgeSeen,
  loadLanguage,
  loadTheme,
  migrate,
  requestPersistentStorage,
  saveData,
  saveHintSeen,
  saveInstallNudgeSeen,
  saveLanguage,
  saveTheme,
  upgradeDocument,
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
    expect(loadTheme()).toBeNull()
    expect(loadHintSeen()).toBe(false)
    expect(() => saveData(sample)).not.toThrow()
    expect(() => saveLanguage('en')).not.toThrow()
    expect(() => saveTheme('dark')).not.toThrow()
    expect(() => saveHintSeen()).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('remembers that the first-run hint was dismissed', () => {
    expect(loadHintSeen()).toBe(false)
    saveHintSeen()
    expect(localStorage.getItem(HINT_SEEN_KEY)).toBe('1')
    expect(loadHintSeen()).toBe(true)
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

  it.each(['system', 'light', 'dark'] as const)('stores and reads the theme %s', (theme) => {
    saveTheme(theme)
    expect(localStorage.getItem(THEME_KEY)).toBe(theme)
    expect(loadTheme()).toBe(theme)
  })

  it('reads no theme when unset or unknown', () => {
    expect(loadTheme()).toBeNull()
    localStorage.setItem(THEME_KEY, 'sepia')
    expect(loadTheme()).toBeNull()
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

describe('install nudge flag', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('remembers that the install nudge was seen', () => {
    expect(loadInstallNudgeSeen()).toBe(false)
    saveInstallNudgeSeen()
    expect(localStorage.getItem(INSTALL_NUDGE_SEEN_KEY)).toBe('1')
    expect(loadInstallNudgeSeen()).toBe(true)
  })

  it('reads as not seen when storage refuses to read', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(INSTALL_NUDGE_SEEN_KEY, '1')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(loadInstallNudgeSeen()).toBe(false)
  })
})

describe('requestPersistentStorage', () => {
  /** jsdom has no `navigator.storage`: each test puts its own in place. */
  function stubStorage(storage: Partial<StorageManager> | undefined) {
    Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage')
    vi.restoreAllMocks()
  })

  it('does nothing without the API', async () => {
    stubStorage(undefined)
    await expect(requestPersistentStorage()).resolves.toBeUndefined()
  })

  it('does not ask when the storage is already persistent', async () => {
    const persist = vi.fn(async () => true)
    stubStorage({ persisted: async () => true, persist })
    await requestPersistentStorage()
    expect(persist).not.toHaveBeenCalled()
  })

  it('asks once when the storage is not persistent yet', async () => {
    const persist = vi.fn(async () => false)
    stubStorage({ persisted: async () => false, persist })
    await requestPersistentStorage()
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('does not throw when the request fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubStorage({ persisted: async () => false, persist: () => Promise.reject(new Error('denied')) })
    await expect(requestPersistentStorage()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })
})

describe('upgradeDocument', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a current-version document as it is', () => {
    expect(upgradeDocument(sample)).toEqual({ ok: true, data: sample })
  })

  it.each([
    ['not an object', 'hola'],
    ['null', null],
    ['no schemaVersion', { areas: [], cards: [], events: [] }],
    ['cards not a list', { ...sample, cards: {} }],
  ])('refuses the wrong shape (%s)', (_, doc) => {
    expect(upgradeDocument(doc)).toEqual({ ok: false, reason: 'shape' })
  })

  it('refuses a document from a newer schema version', () => {
    expect(upgradeDocument({ ...sample, schemaVersion: SCHEMA_VERSION + 1 })).toEqual({ ok: false, reason: 'newer' })
  })

  it('upgrades an older version through the migration steps', () => {
    const steps = { 1: (doc: Record<string, unknown>) => ({ ...doc, upgraded: true }) }
    expect(upgradeDocument(sample, steps, 2)).toEqual({ ok: true, data: { ...sample, schemaVersion: 2, upgraded: true } })
  })

  it('reports a missing or failing step, or one that breaks the shape, as a migration failure', () => {
    const failing = {
      1: () => {
        throw new Error('boom')
      },
    }
    const breaking = { 1: (doc: Record<string, unknown>) => ({ ...doc, cards: null }) }
    expect(upgradeDocument(sample, {}, 2)).toEqual({ ok: false, reason: 'migration' })
    expect(upgradeDocument(sample, failing, 2)).toEqual({ ok: false, reason: 'migration' })
    expect(upgradeDocument(sample, breaking, 2)).toEqual({ ok: false, reason: 'migration' })
  })
})
