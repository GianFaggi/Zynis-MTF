import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeskCard } from '../desk/DeskCard'
import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import { makeCard, makeItem } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { WinsCounter } from './WinsCounter'

const TODAY = new Date(2026, 9, 14, 18, 0)
const at = (daysBefore: number) => new Date(2026, 9, 14 - daysBefore, 12).getTime()

describe('WinsCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    resetStores({
      events: [
        { id: 'e1', type: 'item', at: at(0) },
        { id: 'e2', type: 'item', at: at(3) },
        { id: 'e3', type: 'item', at: at(6) },
        { id: 'e4', type: 'card', at: at(1) },
        { id: 'e5', type: 'note', at: at(0) },
        { id: 'e6', type: 'item', at: at(7) },
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the things done in the last 7 days and says what the number is', () => {
    render(<WinsCounter />)
    const counter = screen.getByRole('button', { name: 'Mis logros: 4 cosas hechas en 7 días' })
    expect(counter).toHaveTextContent('4')
  })

  it('shows 0 with no recent Wins, and nothing else', () => {
    resetStores()
    render(<WinsCounter />)
    expect(screen.getByRole('button', { name: 'Mis logros: 0 cosas hechas en 7 días' })).toHaveTextContent(/^0$/)
  })

  it('opens Mis logros', async () => {
    render(<WinsCounter />)
    await userEvent.click(screen.getByRole('button', { name: /^Mis logros/ }))
    expect(useDeskStore.getState().winsOpen).toBe(true)
  })

  it('goes up and bumps when an Item is checked on the Desk', async () => {
    resetStores({ cards: [makeCard({ id: 'c1', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan' }), makeItem({ id: 'i2', text: 'Leche' })] })] })
    render(
      <>
        <WinsCounter />
        <DeskCard card={useAppStore.getState().data.cards[0]} color="sage" />
      </>,
    )
    const counter = screen.getByRole('button', { name: /^Mis logros/ })
    expect(counter.querySelector('.animate-bump')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Pan' }))
    expect(counter).toHaveAccessibleName('Mis logros: 1 cosa hecha en 7 días')
    expect(counter.querySelector('.animate-bump')).not.toBeNull()
  })
})
