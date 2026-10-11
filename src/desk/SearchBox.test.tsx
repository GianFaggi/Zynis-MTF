import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { makeCard, makeItem } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { useDeskStore } from './deskStore'

const cards = [
  makeCard({ id: 'trip', title: 'Viaje', items: [makeItem({ id: 'i1', text: 'Preparar el mate' })] }),
  makeCard({ id: 'song', title: 'Canción', position: { x: 2500, y: 600, z: 3 } }),
  makeCard({ id: 'other', title: 'Auto' }),
]

function searchState(id: string) {
  return document.querySelector(`[data-card-id="${id}"]`)!.getAttribute('data-search')
}

async function openSearch() {
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  return screen.getByRole('searchbox', { name: 'Buscar en tus tarjetas' })
}

describe('search', () => {
  beforeEach(() => {
    resetStores({ cards })
  })

  it('opens a focused field from the tools pill', async () => {
    const field = await openSearch()
    expect(field).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Buscar' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('outlines matches, Items included, and dims the rest', async () => {
    await userEvent.type(await openSearch(), 'mate')
    expect(searchState('trip')).toBe('hit')
    expect(searchState('song')).toBe('dim')
    expect(searchState('other')).toBe('dim')
  })

  it('ignores accents and case', async () => {
    await userEvent.type(await openSearch(), 'CANCION')
    expect(searchState('song')).toBe('hit')
  })

  it('Enter flies to the first match', async () => {
    await userEvent.type(await openSearch(), 'cancion{Enter}')
    const { view, flying } = useDeskStore.getState()
    expect(flying).toBe(true)
    // The Card at Desk x 2500 is now near the middle of the 1024 px wide window.
    expect((2500 + 118) * view.s + view.x).toBeCloseTo(512, -1)
  })

  it('closing with the button or Esc clears the field and restores every Card', async () => {
    await userEvent.type(await openSearch(), 'mate')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(['trip', 'song', 'other'].map(searchState)).toEqual([null, null, null])

    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    await userEvent.type(screen.getByRole('searchbox'), 'auto')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(searchState('trip')).toBeNull()
  })

  it('Esc closes an open sheet first, not the search', async () => {
    await userEvent.type(await openSearch(), 'auto')
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('auto')
  })
})
