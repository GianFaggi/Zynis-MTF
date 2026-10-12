import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_MS, useDeskStore } from './deskStore'

describe('deskStore feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useDeskStore.setState(useDeskStore.getInitialState(), true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a new toast replaces the current one and gets a new id', () => {
    useDeskStore.getState().showToast('¡Tarjeta completa!', 'Arrastrala al frasco cuando quieras')
    const first = useDeskStore.getState().toast!
    useDeskStore.getState().showToast('¡Al frasco!')
    const second = useDeskStore.getState().toast!

    expect(second).toMatchObject({ title: '¡Al frasco!', detail: undefined })
    expect(second.id).not.toBe(first.id)
  })

  it('hides the toast after 2.8 s, counted from the last one', () => {
    useDeskStore.getState().showToast('Uno')
    vi.advanceTimersByTime(2000)
    useDeskStore.getState().showToast('Dos')
    vi.advanceTimersByTime(TOAST_MS - 1)
    expect(useDeskStore.getState().toast?.title).toBe('Dos')
    vi.advanceTimersByTime(1)
    expect(useDeskStore.getState().toast).toBeNull()
  })

  it('opens and closes Mis logros, and counts bumps', () => {
    useDeskStore.getState().openWins()
    expect(useDeskStore.getState().winsOpen).toBe(true)
    useDeskStore.getState().closeWins()
    expect(useDeskStore.getState().winsOpen).toBe(false)

    useDeskStore.getState().bumpWins()
    useDeskStore.getState().bumpWins()
    expect(useDeskStore.getState().winsBump).toBe(2)
  })
})

describe('deskStore Area editor', () => {
  beforeEach(() => {
    useDeskStore.setState(useDeskStore.getInitialState(), true)
  })

  it('opens for one Area, as new or not, and closes', () => {
    expect(useDeskStore.getState().areaEditor).toBeNull()
    useDeskStore.getState().openAreaEditor('a2')
    expect(useDeskStore.getState().areaEditor).toEqual({ id: 'a2', isNew: false })
    useDeskStore.getState().openAreaEditor('a4', { isNew: true })
    expect(useDeskStore.getState().areaEditor).toEqual({ id: 'a4', isNew: true })
    useDeskStore.getState().closeAreaEditor()
    expect(useDeskStore.getState().areaEditor).toBeNull()
  })
})

describe('deskStore after an Import', () => {
  it('closes the editors, search and Mis logros, and leaves the view alone', () => {
    const view = { x: -300, y: -120, s: 0.6 }
    useDeskStore.setState({
      view,
      editingId: 'c1',
      newCardId: 'c1',
      areaEditor: { id: 'a4', isNew: true },
      searchOpen: true,
      query: 'pan',
      winsOpen: true,
    })

    useDeskStore.getState().resetAfterImport()

    expect(useDeskStore.getState()).toMatchObject({
      view,
      editingId: null,
      newCardId: null,
      areaEditor: null,
      searchOpen: false,
      query: '',
      winsOpen: false,
    })
  })
})
