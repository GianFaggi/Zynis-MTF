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

  it('takes its Area color through --b', () => {
    renderStored('c1')
    expect(screen.getByRole('article').style.getPropertyValue('--b')).toBe('var(--b-preview, var(--color-sage))')
  })
})
