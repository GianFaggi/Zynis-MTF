import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { useWinFeedback } from './feedback'

function feedback() {
  return renderHook(() => useWinFeedback()).result.current
}

describe('useWinFeedback', () => {
  beforeEach(() => {
    resetStores()
  })

  it('a check that finished the Card celebrates and bumps the counter', () => {
    feedback().itemToggled('finished', 'c1')
    expect(useDeskStore.getState().toast).toMatchObject({ title: '¡Tarjeta completa!', detail: 'Arrastrala al frasco cuando quieras' })
    expect(useDeskStore.getState().winsBump).toBe(1)
  })

  it('a plain check only bumps; an uncheck does nothing', () => {
    feedback().itemToggled('checked', 'c1')
    feedback().itemToggled('unchecked', 'c1')
    expect(useDeskStore.getState().toast).toBeNull()
    expect(useDeskStore.getState().winsBump).toBe(1)
  })

  describe('the finished Card celebration', () => {
    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      document.body.innerHTML = ''
    })

    function deskCard(id = 'c1') {
      const card = document.createElement('article')
      card.dataset.cardId = id
      document.body.append(card)
      return card
    }

    it('marks the Card with data-celebrate for a moment when it is finished', () => {
      vi.useFakeTimers()
      const card = deskCard()
      feedback().itemToggled('finished', 'c1')
      expect(card).toHaveAttribute('data-celebrate')
      vi.advanceTimersByTime(700)
      expect(card).not.toHaveAttribute('data-celebrate')
    })

    it('does not celebrate a plain check', () => {
      const card = deskCard()
      feedback().itemToggled('checked', 'c1')
      expect(card).not.toHaveAttribute('data-celebrate')
    })

    it('does not celebrate under reduced motion, but still says so', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
      const card = deskCard()
      feedback().itemToggled('finished', 'c1')
      expect(card).not.toHaveAttribute('data-celebrate')
      expect(useDeskStore.getState().toast?.title).toBe('¡Tarjeta completa!')
    })
  })

  it('a refusal says how many Items are left', () => {
    feedback().refused(1)
    expect(useDeskStore.getState().toast).toMatchObject({ title: 'Todavía no', detail: 'Te falta 1 elemento' })
    feedback().refused(2)
    expect(useDeskStore.getState().toast?.detail).toBe('Te faltan 2 elementos')
  })

  it('jarred bumps and counts the things done in the last 7 days', () => {
    resetStores({
      events: [
        { id: 'e1', type: 'item', at: Date.now() },
        { id: 'e2', type: 'card', at: Date.now() },
        { id: 'e3', type: 'note', at: Date.now() },
      ],
    })
    feedback().jarred()
    expect(useDeskStore.getState().toast).toMatchObject({ title: '¡Al frasco!', detail: 'Ya van 2 cosas hechas en 7 días' })
    expect(useDeskStore.getState().winsBump).toBe(1)
  })

  it('speaks the current language', () => {
    useAppStore.setState({ language: 'en' })
    feedback().refused(3)
    expect(useDeskStore.getState().toast).toMatchObject({ title: 'Not yet', detail: '3 items left' })
  })
})
