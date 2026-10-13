import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import { makeCard } from '../test/fixtures'
import { resetStores } from '../test/stores'
import type { AreaColor, Card } from '../types'
import { Jar } from './Jar'
import { jarRect } from './jarLayout'

const colors: Record<string, AreaColor> = { a1: 'sage', a2: 'sand', a3: 'sky' }

function JarOnDesk() {
  const areas = useAppStore((state) => state.data.areas)
  const cards = useAppStore((state) => state.data.cards)
  const jarred = cards.filter((card) => card.jarredAt !== null).sort((a, b) => a.jarredAt! - b.jarredAt!)
  return <Jar rect={jarRect(areas)!} cards={jarred} colorOf={(id) => colors[id]} />
}

function pieces(container: HTMLElement) {
  return [...container.querySelectorAll('g[clip-path] rect')]
}

const jarred: Card[] = [
  makeCard({ id: 'v2', areaId: 'a2', title: 'Vida 2', jarredAt: 30 }),
  makeCard({ id: 't1', areaId: 'a1', title: 'Trabajo', jarredAt: 10 }),
  makeCard({ id: 'v1', areaId: 'a2', title: 'Vida 1', jarredAt: 20 }),
]

describe('Jar', () => {
  beforeEach(() => {
    resetStores({ cards: [...jarred, makeCard({ id: 'desk', title: 'En el escritorio' })] })
  })

  it('holds one piece per Card in its Area color, oldest first, and counts them', () => {
    const { container } = render(<JarOnDesk />)
    expect(pieces(container).map((piece) => piece.getAttribute('fill'))).toEqual([
      'var(--color-sage)',
      'var(--color-sand)',
      'var(--color-sand)',
    ])
    expect(screen.getByRole('button', { name: 'Frasco: 3 tarjetas. Abrir Mis logros' })).toHaveTextContent('3')
  })

  it('shows the caption with the things done this week', () => {
    resetStores({ cards: jarred, events: [{ id: 'e1', type: 'item', at: Date.now() }] })
    render(<JarOnDesk />)
    expect(screen.getByText('Tu frasco')).toBeInTheDocument()
    expect(screen.getByText('1 esta semana · tocalo para ver más')).toBeInTheDocument()
  })

  it('Enter opens Mis logros', async () => {
    render(<JarOnDesk />)
    screen.getByRole('button', { name: /^Frasco/ }).focus()
    await userEvent.keyboard('{Enter}')
    expect(useDeskStore.getState().winsOpen).toBe(true)
  })

  it('a pointer click is left to the Desk', async () => {
    render(<JarOnDesk />)
    await userEvent.click(screen.getByRole('button', { name: /^Frasco/ }))
    expect(useDeskStore.getState().winsOpen).toBe(false)
  })

  it('two Jars on the page clip their pieces with their own glass', () => {
    const { container } = render(
      <>
        <JarOnDesk />
        <JarOnDesk />
      </>,
    )
    const ids = [...container.querySelectorAll('clipPath')].map((clip) => clip.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    const used = [...container.querySelectorAll('g[clip-path]')].map((group) => group.getAttribute('clip-path'))
    expect(used).toEqual(ids.map((id) => `url(#${id})`))
  })

  it('drops only the piece of a Card that just came in; nothing drops on the first render', () => {
    const { container } = render(<JarOnDesk />)
    expect(container.querySelectorAll('.animate-drop')).toHaveLength(0)

    act(() => useAppStore.getState().jarCard('desk'))
    const dropping = container.querySelectorAll('.animate-drop')
    expect(dropping).toHaveLength(1)
    expect(pieces(container)).toHaveLength(4)
    expect(pieces(container).at(-1)!.parentElement).toBe(dropping[0])
  })
})
