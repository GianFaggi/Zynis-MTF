import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/appStore'
import { makeCard, makeItem } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { DeskCard } from './DeskCard'
import { useDeskStore } from './deskStore'

const items = Array.from({ length: 7 }, (_, i) => makeItem({ id: `i${i}`, text: `Elemento ${i + 1}`, done: i < 2 }))
const listCard = makeCard({ id: 'c1', title: 'Compras', items })

function renderStored(id: string) {
  const card = useAppStore.getState().data.cards.find((candidate) => candidate.id === id)!
  return render(<DeskCard card={card} color="sage" />)
}

describe('DeskCard', () => {
  beforeEach(() => {
    resetStores({ cards: [listCard] })
  })

  it('shows the first 5 Items, "+2 más" and the checked count', () => {
    renderStored('c1')
    const article = screen.getByRole('article', { name: 'Compras' })
    expect(within(article).getAllByRole('listitem')).toHaveLength(5)
    expect(within(article).getByText('+2 más')).toBeInTheDocument()
    expect(within(article).getByText('2/7')).toBeInTheDocument()
  })

  it('checking an Item toggles it in the store without opening the editor', async () => {
    renderStored('c1')
    await userEvent.click(screen.getByRole('button', { name: 'Elemento 3' }))

    expect(useAppStore.getState().data.cards[0].items[2].done).toBe(true)
    expect(useDeskStore.getState().editingId).toBeNull()
  })

  it('shows the pin mark for a pinned Card', () => {
    resetStores({ cards: [makeCard({ id: 'p', title: 'Wifi', pinned: true })] })
    renderStored('p')
    expect(screen.getByRole('img', { name: 'Fijada' })).toBeInTheDocument()
  })

  it('is named by its first text line when it has no title, and Enter opens it', async () => {
    resetStores({ cards: [makeCard({ id: 'n', body: 'Llamar al contador\nantes del 20' })] })
    renderStored('n')
    const article = screen.getByRole('article', { name: 'Llamar al contador' })
    article.focus()
    await userEvent.keyboard('{Enter}')
    expect(useDeskStore.getState().editingId).toBe('n')
  })

  it('a finished Card shows the "Llevala al frasco" chip instead of the count', () => {
    resetStores({ cards: [makeCard({ id: 'done', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true })] })] })
    renderStored('done')
    const article = screen.getByRole('article', { name: 'Compras' })
    expect(article).toHaveAttribute('data-finished')
    expect(within(article).getByText('Llevala al frasco')).toBeInTheDocument()
    expect(within(article).queryByText('1/1')).not.toBeInTheDocument()

    const icon = within(article).getByText('Llevala al frasco').querySelector('svg')!
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('a Card without Items is not finished and has no seal', () => {
    resetStores({ cards: [makeCard({ id: 'n', title: 'Solo texto' })] })
    renderStored('n')
    expect(screen.getByRole('article')).not.toHaveAttribute('data-finished')
    expect(screen.getByRole('article').querySelector('[data-seal]')).toBeNull()
  })

  it('a finished Card wears the seal, outside the near look so it also shows zoomed out', () => {
    resetStores({ cards: [makeCard({ id: 'done', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true })] })] })
    renderStored('done')
    const seal = screen.getByRole('article').querySelector('[data-seal]')!
    expect(seal).toHaveAttribute('aria-hidden', 'true')
    expect(seal.parentElement).toBe(screen.getByRole('article'))
  })

  it('a pinned finished Card moves its pin to the left of the seal', () => {
    const pan = makeItem({ id: 'i1', text: 'Pan', done: true })
    resetStores({ cards: [makeCard({ id: 'p', title: 'Wifi', pinned: true, items: [pan] }), makeCard({ id: 'q', title: 'Otra', pinned: true })] })
    renderStored('p')
    renderStored('q')
    const [besideSeal, alone] = screen.getAllByRole('img', { name: 'Fijada' })
    expect(besideSeal).toHaveClass('right-[38px]')
    expect(alone).toHaveClass('right-3')
  })

  it('checking the last Item plays the one-time celebration on the Card', async () => {
    resetStores({ cards: [makeCard({ id: 'c', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan' })] })] })
    renderStored('c')
    await userEvent.click(screen.getByRole('button', { name: 'Pan' }))
    expect(screen.getByRole('article')).toHaveAttribute('data-celebrate')
  })

  it('the chip goes away after unchecking an Item', async () => {
    resetStores({ cards: [makeCard({ id: 'done', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true }), makeItem({ id: 'i2', text: 'Leche', done: true })] })] })
    const { rerender } = renderStored('done')
    await userEvent.click(screen.getByRole('button', { name: 'Leche' }))
    rerender(<DeskCard card={useAppStore.getState().data.cards[0]} color="sage" />)

    expect(screen.queryByText('Llevala al frasco')).not.toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('checking the last Item celebrates: toast and a bump of the counter', async () => {
    resetStores({ cards: [makeCard({ id: 'c', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true }), makeItem({ id: 'i2', text: 'Leche' })] })] })
    renderStored('c')
    await userEvent.click(screen.getByRole('button', { name: 'Leche' }))

    expect(useDeskStore.getState().toast).toMatchObject({ title: '¡Tarjeta completa!', detail: 'Arrastrala al frasco cuando quieras' })
    expect(useDeskStore.getState().winsBump).toBe(1)
    expect(useAppStore.getState().data.events.map((event) => event.type)).toEqual(['item', 'card'])
  })

  it('takes its Area color through --b', () => {
    renderStored('c1')
    expect(screen.getByRole('article').style.getPropertyValue('--b')).toBe('var(--b-preview, var(--color-sage))')
  })
})
