import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/appStore'
import { makeArea, makeCard, rowOfAreas } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { useDeskStore } from './deskStore'
import { Dock } from './Dock'
import { areaView, deskBounds, fitRect } from './geometry'

const fourth = makeArea({ id: 'a4', name: 'Facu', color: 'plum', rect: { x: 80, y: 1300, w: 980, h: 600 } })
const jsdomViewport = { w: 1024, h: 768 }

describe('Dock', () => {
  beforeEach(() => {
    resetStores({ areas: [...rowOfAreas(), fourth] })
  })

  it('offers one button per stored Area, then See all and Tidy up', () => {
    render(<Dock />)
    const dock = screen.getByRole('navigation', { name: 'Áreas' })
    expect(within(dock).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Trabajo',
      'Vida',
      'Recordar',
      'Facu',
      'Ver todo',
      'Ordenar',
    ])
  })

  it('an Area button flies the view to that Area', async () => {
    render(<Dock />)
    await userEvent.click(screen.getByRole('button', { name: 'Facu' }))
    expect(useDeskStore.getState()).toMatchObject({ view: areaView(fourth, jsdomViewport), flying: true })
  })

  it('See all fits every Area and every Card', async () => {
    const far = makeCard({ id: 'far', position: { x: 6000, y: 4000 } })
    resetStores({ areas: [...rowOfAreas(), fourth], cards: [far] })
    render(<Dock />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo' }))
    const { areas, cards } = useAppStore.getState().data
    expect(useDeskStore.getState().view).toEqual(fitRect(deskBounds(areas, cards, new Map())!, jsdomViewport))
  })

  it('Tidy up moves the Cards into their Areas and animates', async () => {
    resetStores({ cards: [makeCard({ id: 'c1', areaId: 'a2', position: { x: -900, y: -900 } })] })
    render(<Dock />)
    await userEvent.click(screen.getByRole('button', { name: 'Ordenar' }))
    const [card] = useAppStore.getState().data.cards
    expect(card.areaId).toBe('a2')
    expect(card.position.x).toBeGreaterThan(1140)
    expect(useDeskStore.getState().tidying).toBe(true)
  })
})
