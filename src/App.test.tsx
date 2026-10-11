import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useDeskStore } from './desk/deskStore'
import { LANGUAGE_KEY } from './lib/storage'
import { useAppStore } from './store/appStore'
import { resetStores } from './test/stores'

function desk() {
  return screen.getByRole('region', { name: /Escritorio|Desk/ })
}

function areaLabels() {
  return within(desk())
    .getAllByRole('button')
    .filter((button) => button.hasAttribute('data-area-label'))
    .map((button) => button.getAttribute('aria-label'))
}

describe('App', () => {
  beforeEach(() => {
    resetStores()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the wordmark and the Desk with its three Areas', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'mtf' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Escritorio' })).toBeInTheDocument()
    expect(areaLabels()).toEqual(['Trabajo, 0 tarjetas', 'Vida, 0 tarjetas', 'Recordar, 0 tarjetas'])
    expect(document.documentElement.lang).toBe('es')
  })

  it('the tools pill holds search, the wins counter and settings, in that order', () => {
    render(<App />)
    const counter = screen.getByRole('button', { name: 'Mis logros: 0 cosas hechas en 7 días' })
    const pill = [...counter.parentElement!.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'))
    expect(pill).toEqual(['Buscar', 'Mis logros: 0 cosas hechas en 7 días', 'Ajustes'])
  })

  it('the wins counter opens Mis logros, which Esc closes back to the counter', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /^Mis logros/ }))
    expect(screen.getByRole('dialog', { name: 'Mis logros' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Mis logros/ })).toHaveFocus()
  })

  it('announces toasts in an always-mounted status region', () => {
    render(<App />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => useDeskStore.getState().showToast('Volvió al escritorio'))
    expect(screen.getByRole('status')).toHaveTextContent('Volvió al escritorio')
  })

  it('opens Settings with the language selector', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))

    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switching to English changes every text, the Area names and the page language, and is remembered', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    await userEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByRole('region', { name: 'Desk' })).toBeInTheDocument()
    expect(areaLabels()).toEqual(['Work, 0 cards', 'Life, 0 cards', 'Remember, 0 cards'])
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
  })

  it('the + button creates a Card in the Area at the middle of the view and opens it as new', async () => {
    render(<App />)
    await act(async () => {}) // let the Desk set its first view
    // jsdom's window is 1024 × 768: with this view its middle is Desk point (1500, 600), inside Vida.
    useDeskStore.getState().setView({ x: 512 - 1500, y: 384 - 600, s: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Nueva tarjeta' }))

    const [card] = useAppStore.getState().data.cards
    expect(card.areaId).toBe('a2')
    expect(useDeskStore.getState()).toMatchObject({ editingId: card.id, newCardId: card.id })
  })

  it('closes Settings with Esc', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajustes' })).toHaveFocus()
  })

  it('keeps working when storage refuses to write', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    await userEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(areaLabels()).toContain('Work, 0 cards')
    expect(useAppStore.getState().language).toBe('en')
  })
})
