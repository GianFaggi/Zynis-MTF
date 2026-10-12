import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeBackup } from './backup/backup'
import { useDeskStore } from './desk/deskStore'
import { HINT_SEEN_KEY, LANGUAGE_KEY, THEME_KEY } from './lib/storage'
import { useAppStore } from './store/appStore'
import { USER_AGENTS, restoreDevice, stubDevice } from './test/device'
import { makeCard, makeData, rowOfAreas } from './test/fixtures'
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
    restoreDevice()
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('data-theme')
  })

  it('shows the wordmark and the Desk with its three Areas', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'mtf' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Escritorio' })).toBeInTheDocument()
    expect(areaLabels()).toEqual(['Trabajo, 0 tarjetas', 'Vida, 0 tarjetas', 'Recordar, 0 tarjetas'])
    expect(document.documentElement.lang).toBe('es')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('opens in a stored Dark theme', () => {
    useAppStore.setState({ theme: 'dark' })
    render(<App />)
    expect(document.documentElement.dataset.theme).toBe('dark')
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

  it('opens Settings with the language and theme selectors', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))

    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument()
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

  it('Settings has the theme selector, with Sistema active by default', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))

    const group = screen.getByRole('group', { name: 'Tema' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual(['Sistema', 'Claro', 'Oscuro'])
    expect(within(group).getByRole('button', { name: 'Sistema' })).toHaveAttribute('aria-pressed', 'true')
    for (const button of within(group).getAllByRole('button')) expect(button.className).not.toMatch(/accent/)
  })

  it('choosing Oscuro marks the page dark and is remembered; Sistema removes the mark', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    const group = screen.getByRole('group', { name: 'Tema' })

    await userEvent.click(within(group).getByRole('button', { name: 'Oscuro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(within(group).getByRole('button', { name: 'Oscuro' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(within(group).getByRole('button', { name: 'Sistema' }))
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(localStorage.getItem(THEME_KEY)).toBe('system')
  })

  it('the theme selector reads Theme · System · Light · Dark in English', async () => {
    useAppStore.setState({ language: 'en' })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

    const group = screen.getByRole('group', { name: 'Theme' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual(['System', 'Light', 'Dark'])
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

  it('Settings shows the language, then the theme, then the Backup section, then the install section', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    const settings = screen.getByRole('dialog', { name: 'Ajustes' })

    const labels = [...settings.querySelectorAll('span.uppercase')].map((label) => label.textContent)
    expect(labels).toEqual(['Idioma', 'Tema', 'Copia de seguridad', 'Instalar la app'])
    expect(within(settings).getByRole('button', { name: 'Exportar copia' })).toBeInTheDocument()
    expect(within(settings).getByRole('button', { name: 'Importar copia' })).toBeInTheDocument()
  })

  it('a confirmed Import closes Settings, shows the new Desk and says so', async () => {
    const imported = makeData({
      areas: rowOfAreas(),
      cards: [makeCard({ id: 't1', areaId: 'a2', title: 'De la copia' }), makeCard({ id: 't2', title: 'Otra', jarredAt: 3 })],
    })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    const file = new File([makeBackup(imported, new Date())], 'mtf-backup-2026-10-11.json', { type: 'application/json' })
    await userEvent.upload(screen.getByLabelText('Importar copia'), file)
    await userEvent.click(await screen.findByRole('button', { name: 'Reemplazar mis datos' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useAppStore.getState().data).toEqual(imported)
    expect(areaLabels()).toContain('Vida, 1 tarjeta')
    expect(screen.getByRole('status')).toHaveTextContent('Copia importada')
    expect(screen.getByRole('status')).toHaveTextContent('2 tarjetas')
  })

  it('the install nudge\'s "Cómo" opens Settings with the install section', async () => {
    stubDevice({ userAgent: USER_AGENTS.iphone, touchPoints: 5 })
    localStorage.setItem(HINT_SEEN_KEY, '1')
    render(<App />)
    act(() => {
      const { data } = useAppStore.getState()
      useAppStore.setState({ data: { ...data, events: [{ id: 'n1', type: 'note', at: Date.now() }] } })
    })
    await userEvent.click(screen.getByRole('button', { name: 'Cómo' }))

    const settings = screen.getByRole('dialog', { name: 'Ajustes' })
    expect(within(settings).getByText('Elegí “Agregar a inicio”.')).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))

    expect(areaLabels()).toContain('Work, 0 cards')
    expect(useAppStore.getState().language).toBe('en')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
