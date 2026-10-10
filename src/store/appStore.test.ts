import { afterEach, describe, expect, it, vi } from 'vitest'
import { DATA_KEY, LANGUAGE_KEY, SCHEMA_VERSION } from '../lib/storage'
import type { MtfData } from '../types'
import { createAppStore } from './appStore'

function browserLanguages(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
}

describe('appStore', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the browser language on first launch', () => {
    browserLanguages(['es-AR'])
    expect(createAppStore().getState().language).toBe('es')
  })

  it('a stored language wins over the browser language', () => {
    browserLanguages(['es-AR'])
    localStorage.setItem(LANGUAGE_KEY, 'en')
    expect(createAppStore().getState().language).toBe('en')
  })

  it('setLanguage changes the language and writes mtf_language', () => {
    browserLanguages(['es-AR'])
    const store = createAppStore()
    store.getState().setLanguage('en')
    expect(store.getState().language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
  })

  it('loads the stored document on create', () => {
    const stored: MtfData = { schemaVersion: SCHEMA_VERSION, areas: [], cards: [], events: [{ id: 'e1', type: 'note', at: 1 }] }
    localStorage.setItem(DATA_KEY, JSON.stringify(stored))
    expect(createAppStore().getState().data).toEqual(stored)
  })

  it('replacing data writes mtf_data', () => {
    const store = createAppStore()
    expect(localStorage.getItem(DATA_KEY)).toBeNull()

    const next: MtfData = { ...store.getState().data, events: [{ id: 'e1', type: 'note', at: 1 }] }
    store.setState({ data: next })
    expect(JSON.parse(localStorage.getItem(DATA_KEY)!)).toEqual(next)
  })

  it('does not write mtf_data when only the language changes', () => {
    createAppStore().getState().setLanguage('en')
    expect(localStorage.getItem(DATA_KEY)).toBeNull()
  })
})
