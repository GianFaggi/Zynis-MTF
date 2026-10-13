import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import { makeCard } from '../test/fixtures'
import { resetStores } from '../test/stores'
import type { WinEvent } from '../types'
import { MisLogros } from './MisLogros'
import { WinsCounter } from './WinsCounter'

// Today is pinned to Wednesday 14 October 2026 (Date only, so user events still run).
const TODAY = new Date(2026, 9, 14, 18, 0)

function daysBefore(n: number, hour = 12) {
  return new Date(2026, 9, 14 - n, hour).getTime()
}

let n = 0
function win(type: WinEvent['type'], at: number): WinEvent {
  return { id: `e${++n}`, type, at }
}

function openMisLogros(name = 'Mis logros') {
  useDeskStore.getState().openWins()
  render(<MisLogros />)
  return screen.getByRole('dialog', { name })
}

describe('MisLogros', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    resetStores()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sums up the week: things done, Items, Cards, and notes apart', () => {
    resetStores({
      events: [
        ...Array.from({ length: 5 }, () => win('item', daysBefore(1))),
        win('card', daysBefore(1)),
        win('card', daysBefore(0)),
        ...Array.from({ length: 3 }, () => win('note', daysBefore(2))),
      ],
    })
    const dialog = openMisLogros()

    expect(within(dialog).getByText('cosas hechas en los últimos 7 días').previousElementSibling).toHaveTextContent('7')
    expect(within(dialog).getByText('elementos tachados').previousElementSibling).toHaveTextContent('5')
    expect(within(dialog).getByText('tarjetas terminadas').previousElementSibling).toHaveTextContent('2')
    expect(within(dialog).getByText('notas escritas').previousElementSibling).toHaveTextContent('3')
    expect(within(dialog).getByRole('img', { name: 'Cosas hechas por día, últimos 7 días' })).toBeInTheDocument()
  })

  it('names the best day, then the quiet-days line', () => {
    resetStores({ events: [win('item', daysBefore(1)), win('item', daysBefore(1)), win('item', daysBefore(0))] })
    openMisLogros()
    expect(screen.getByText('Tu mejor día fue el martes, con 2. Los días tranquilos también cuentan.')).toBeInTheDocument()
  })

  it('a quiet week only says that quiet days count too', () => {
    resetStores({ events: [win('item', daysBefore(30)), win('note', daysBefore(0))] })
    const dialog = openMisLogros()
    expect(within(dialog).getByText('Los días tranquilos también cuentan.')).toBeInTheDocument()
    expect(within(dialog).queryByText(/mejor día/)).not.toBeInTheDocument()
  })

  it('counts everything done since the start', () => {
    resetStores({ events: [...Array.from({ length: 4 }, () => win('item', daysBefore(90))), win('card', daysBefore(0)), win('note', daysBefore(0))] })
    openMisLogros()
    expect(screen.getByText('Desde que empezaste: 5 cosas hechas.')).toBeInTheDocument()
  })

  it('lists the Cards in the Jar, newest first, with their Area and day', () => {
    resetStores({
      cards: [
        makeCard({ id: 'old', areaId: 'a1', title: 'Informe', jarredAt: daysBefore(5) }),
        makeCard({ id: 'new', areaId: 'a2', title: 'Compras', jarredAt: daysBefore(0) }),
        makeCard({ id: 'mid', areaId: 'a1', title: 'Llamar al banco', jarredAt: daysBefore(1) }),
        makeCard({ id: 'desk', title: 'En el escritorio' }),
      ],
    })
    const dialog = openMisLogros()
    const rows = within(within(dialog).getByRole('region', { name: 'En el frasco' })).getAllByRole('listitem')

    expect(rows.map((row) => row.querySelector('b')!.textContent)).toEqual(['Compras', 'Llamar al banco', 'Informe'])
    expect(rows[0]).toHaveTextContent('Vida · hoy')
    expect(rows[1]).toHaveTextContent('Trabajo · ayer')
    expect(rows[2]).toHaveTextContent('Trabajo · hace 5 días')
  })

  it('an empty Jar says where jarred Cards will show up', () => {
    openMisLogros()
    expect(screen.getByText('Cuando lleves una tarjeta al frasco, aparece acá.')).toBeInTheDocument()
  })

  it('Devolver puts the Card back on the Desk and keeps the sheet open', async () => {
    resetStores({ cards: [makeCard({ id: 'c1', areaId: 'a2', title: 'Llamar al banco', jarredAt: daysBefore(1) })] })
    openMisLogros()
    await userEvent.click(screen.getByRole('button', { name: 'Devolver' }))

    expect(useAppStore.getState().data.cards[0].jarredAt).toBeNull()
    expect(useDeskStore.getState().toast?.title).toBe('Volvió al escritorio')
    expect(screen.getByRole('dialog', { name: 'Mis logros' })).toBeInTheDocument()
    expect(screen.getByText('Cuando lleves una tarjeta al frasco, aparece acá.')).toBeInTheDocument()
  })

  it('closes with Esc', async () => {
    openMisLogros()
    await userEvent.keyboard('{Escape}')
    expect(useDeskStore.getState().winsOpen).toBe(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('speaks English', () => {
    resetStores({
      events: [win('item', daysBefore(1)), win('item', daysBefore(1))],
      cards: [makeCard({ id: 'c1', areaId: 'a1', title: 'Report', jarredAt: daysBefore(2) })],
    })
    useAppStore.setState({ language: 'en' })
    const dialog = openMisLogros('My wins')

    expect(within(dialog).getByText('Your best day was Tuesday, with 2. Quiet days count too.')).toBeInTheDocument()
    expect(within(dialog).getByText('Since you started: 2 things done.')).toBeInTheDocument()
    expect(within(dialog).getByText('Work · 2 days ago')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Take out' })).toBeInTheDocument()
  })
})

describe('MisLogros by Area', () => {
  // Trabajo: 3 things done (2 Items of one Card, then its Card Win). Vida: 2. Recordar: nothing.
  const cards = [
    makeCard({ id: 't1', areaId: 'a1', title: 'Informe', jarredAt: daysBefore(1) }),
    makeCard({ id: 'v1', areaId: 'a2', title: 'Compras', jarredAt: daysBefore(0) }),
    makeCard({ id: 'v2', areaId: 'a2', title: 'Plantas' }),
  ]
  const events: WinEvent[] = [
    { id: 'w1', type: 'item', at: daysBefore(2), cardId: 't1', areaId: 'a1' },
    { id: 'w2', type: 'item', at: daysBefore(2), cardId: 't1', areaId: 'a1' },
    { id: 'w3', type: 'card', at: daysBefore(1), cardId: 't1', areaId: 'a1' },
    { id: 'w4', type: 'card', at: daysBefore(0), cardId: 'v1', areaId: 'a2' },
    // Checked while Plantas was in Trabajo; it counts in Vida, where the Card is now.
    { id: 'w5', type: 'item', at: daysBefore(0), cardId: 'v2', areaId: 'a1' },
  ]

  function mainNumber(dialog: HTMLElement) {
    return within(dialog).getByText(/cosas? hechas? en los últimos 7 días/).previousElementSibling!.textContent
  }

  function jarList(dialog: HTMLElement) {
    return within(within(dialog).getByRole('region', { name: 'En el frasco' }))
      .queryAllByRole('listitem')
      .map((row) => row.querySelector('b')!.textContent)
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    resetStores({ cards, events })
    useAppStore.setState({ areaJars: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('has no filter with "Frasco por área" off, and counts every Area', () => {
    useAppStore.setState({ areaJars: false })
    useDeskStore.getState().openWins('a2')
    render(<MisLogros />)
    const dialog = screen.getByRole('dialog', { name: 'Mis logros' })
    expect(within(dialog).queryByRole('group', { name: 'Área' })).not.toBeInTheDocument()
    expect(mainNumber(dialog)).toBe('5')
  })

  it('opens on "Todas", followed by every Area', () => {
    const dialog = openMisLogros()
    const filter = within(dialog).getByRole('group', { name: 'Área' })
    expect(within(filter).getAllByRole('button').map((button) => button.textContent)).toEqual(['Todas', 'Trabajo', 'Vida', 'Recordar'])
    expect(within(filter).getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
    expect(mainNumber(dialog)).toBe('5')
  })

  it("one Area counts its Cards' Wins only, and lists only its Cards in the Jar; Todas counts them all again", async () => {
    const dialog = openMisLogros()
    const filter = within(dialog).getByRole('group', { name: 'Área' })

    await userEvent.click(within(filter).getByRole('button', { name: 'Vida' }))
    expect(mainNumber(dialog)).toBe('2')
    expect(within(dialog).getByText('Desde que empezaste: 2 cosas hechas.')).toBeInTheDocument()
    expect(jarList(dialog)).toEqual(['Compras'])

    await userEvent.click(within(filter).getByRole('button', { name: 'Trabajo' }))
    expect(mainNumber(dialog)).toBe('3')
    expect(jarList(dialog)).toEqual(['Informe'])

    await userEvent.click(within(filter).getByRole('button', { name: 'Todas' }))
    expect(mainNumber(dialog)).toBe('5')
    expect(jarList(dialog)).toEqual(['Compras', 'Informe'])
  })

  it('a quiet Area says that quiet days count too, and shows no warning', async () => {
    const dialog = openMisLogros()
    await userEvent.click(within(within(dialog).getByRole('group', { name: 'Área' })).getByRole('button', { name: 'Recordar' }))
    expect(mainNumber(dialog)).toBe('0')
    expect(within(dialog).getByText('Los días tranquilos también cuentan.')).toBeInTheDocument()
    expect(within(dialog).getByText('Cuando lleves una tarjeta al frasco, aparece acá.')).toBeInTheDocument()
  })

  it('opened from an Area Jar it shows that Area; an Area that is gone reads as Todas', () => {
    useDeskStore.getState().openWins('a2')
    const { unmount } = render(<MisLogros />)
    expect(screen.getByRole('button', { name: 'Vida' })).toHaveAttribute('aria-pressed', 'true')
    expect(mainNumber(screen.getByRole('dialog'))).toBe('2')
    unmount()

    useDeskStore.getState().openWins('gone')
    render(<MisLogros />)
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
    expect(mainNumber(screen.getByRole('dialog'))).toBe('5')
  })

  it('the wins counter stays global while one Area is chosen', async () => {
    render(<WinsCounter />)
    const dialog = openMisLogros()
    await userEvent.click(within(within(dialog).getByRole('group', { name: 'Área' })).getByRole('button', { name: 'Vida' }))
    expect(screen.getByRole('button', { name: 'Mis logros: 5 cosas hechas en 7 días' })).toBeInTheDocument()
  })
})
