import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import { makeCard } from '../test/fixtures'
import { resetStores } from '../test/stores'
import type { WinEvent } from '../types'
import { MisLogros } from './MisLogros'

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
