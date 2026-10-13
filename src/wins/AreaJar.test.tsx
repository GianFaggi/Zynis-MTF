import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Desk } from '../desk/Desk'
import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import { makeCard, rowOfAreas } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { AreaJar } from './AreaJar'

function areaJars() {
  return within(screen.getByRole('region', { name: 'Escritorio' }))
    .getAllByRole('button')
    .filter((button) => button.dataset.jar)
}

describe('AreaJar', () => {
  beforeEach(() => {
    resetStores({
      cards: [
        makeCard({ id: 't1', areaId: 'a1', title: 'Trabajo', jarredAt: 10 }),
        makeCard({ id: 'v1', areaId: 'a2', title: 'Vida 1', jarredAt: 20 }),
        makeCard({ id: 'v2', areaId: 'a2', title: 'Vida 2', jarredAt: 30 }),
        makeCard({ id: 'desk', areaId: 'a2', title: 'En el escritorio' }),
      ],
    })
  })

  it('no Area Jar is drawn with "Frasco por área" off', () => {
    render(<Desk />)
    expect(areaJars()).toEqual([])
    expect(screen.getByRole('button', { name: 'Frasco: 3 tarjetas. Abrir Mis logros' })).toBeInTheDocument()
  })

  it("with the option on, each Area's Jar counts that Area's Cards in the Jar, and the Desk Jar keeps them all", () => {
    useAppStore.setState({ areaJars: true })
    render(<Desk />)
    expect(areaJars().map((jar) => [jar.dataset.jar, jar.getAttribute('aria-label'), jar.textContent])).toEqual([
      ['a1', 'Frasco de Trabajo: 1 tarjeta. Abrir Mis logros', '1'],
      ['a2', 'Frasco de Vida: 2 tarjetas. Abrir Mis logros', '2'],
      ['a3', 'Frasco de Recordar: 0 tarjetas. Abrir Mis logros', '0'],
    ])
    expect(screen.getByRole('button', { name: 'Frasco: 3 tarjetas. Abrir Mis logros' })).toBeInTheDocument()
  })

  it('turning the option on and off shows and hides the Area Jars', () => {
    render(<Desk />)
    act(() => useAppStore.getState().setAreaJars(true))
    expect(areaJars()).toHaveLength(3)
    act(() => useAppStore.getState().setAreaJars(false))
    expect(areaJars()).toEqual([])
  })

  it('Enter opens Mis logros on that Area', async () => {
    useAppStore.setState({ areaJars: true })
    render(<Desk />)
    screen.getByRole('button', { name: /^Frasco de Vida/ }).focus()
    await userEvent.keyboard('{Enter}')
    expect(useDeskStore.getState()).toMatchObject({ winsOpen: true, winsAreaId: 'a2' })
  })

  it('a pointer click is left to the Desk', async () => {
    // Alone, without the Desk's gesture controller (jsdom has no pointer capture).
    const vida = rowOfAreas()[1]
    render(<AreaJar area={vida} name="Vida" cards={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /^Frasco de Vida/ }))
    expect(useDeskStore.getState().winsOpen).toBe(false)
  })
})
