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

  it('names every handwriting label in both languages (#47)', () => {
    const keys = ['handwritingOption', 'handwriting', 'addHandwriting', 'inkBox', 'inkUndo', 'inkEraser', 'inkClear', 'inkClearConfirm', 'inkFull'] as const
    for (const key of keys) {
      expect(es).toHaveProperty(key)
      expect(en).toHaveProperty(key)
    }
    expect(translate('es', 'inkClearConfirm')).toBe('¿Borrar todo? Tocá otra vez')
    expect(translate('en', 'inkFull')).toBe('This handwriting is full')
  })

  it('names the pens and their editor in both languages (#51)', () => {
    const keys = ['pens', 'penInk', 'penNumbered', 'penButton', 'penEdit', 'penColor', 'penWidth', 'penFine', 'penMedium', 'penBold', 'penDone'] as const
    for (const key of keys) {
      expect(es).toHaveProperty(key)
      expect(en).toHaveProperty(key)
    }
    expect(translate('es', 'penNumbered', 2)).toBe('Lápiz 2')
    expect(translate('en', 'penNumbered', 3)).toBe('Pen 3')
    expect(translate('es', 'penButton', 'Lápiz 2', 'Fino')).toBe('Lápiz 2, Fino')
    expect(translate('es', 'penEdit', 'Tinta')).toBe('Editar Tinta')
    expect(translate('en', 'penEdit', 'Ink')).toBe('Edit Ink')
    expect([translate('en', 'penFine'), translate('en', 'penMedium'), translate('en', 'penBold'), translate('en', 'penDone')]).toEqual(['Fine', 'Medium', 'Bold', 'Done'])
    expect([translate('es', 'penWidth'), translate('en', 'penWidth')]).toEqual(['Grosor', 'Width'])
  })

  it('says the sync toast in both languages (#37)', () => {
    expect(translate('es', 'syncUpToDate')).toBe('Tu escritorio está al día')
    expect(translate('en', 'syncUpToDate')).toBe('Your desk is up to date')
    expect(translate('en', 'syncPending', 3)).toBe('3 changes go up on the next sync.')
    expect(translate('es', 'choiceUseAccount')).toBe('Usar el de la cuenta')
    expect(translate('en', 'choiceUpload')).toBe('Upload this one')
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
