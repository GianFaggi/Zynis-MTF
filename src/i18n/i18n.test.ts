import { describe, expect, it } from 'vitest'
import { detectLanguage, translate } from '.'
import { en } from './locales/en'
import { es } from './locales/es'

describe('dictionaries', () => {
  it('es and en have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  it('every text is filled in both languages', () => {
    for (const dictionary of [es, en]) {
      for (const value of Object.values(dictionary)) {
        if (typeof value === 'string') expect(value.trim()).not.toBe('')
      }
    }
  })

  it('translates a key into the requested language', () => {
    expect(translate('es', 'settings')).toBe('Ajustes')
    expect(translate('en', 'settings')).toBe('Settings')
  })
})

describe('detectLanguage', () => {
  it.each([
    [['es-AR'], 'es'],
    [['es'], 'es'],
    [['ES-mx', 'en'], 'es'],
    [['fr-FR'], 'en'],
    [['en-US', 'es-AR'], 'en'],
    [['est'], 'en'],
    [[], 'en'],
  ])('%j → %s', (languages, expected) => {
    expect(detectLanguage(languages)).toBe(expected)
  })
})
