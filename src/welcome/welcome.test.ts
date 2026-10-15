import { beforeEach, describe, expect, it } from 'vitest'
import { useDeskStore } from '../desk/deskStore'
import { WELCOME_PLACED_KEY } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { makeCard } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { placeWelcomeOnce, welcomeContent } from './welcome'

const cards = () => useAppStore.getState().data.cards

describe('placeWelcomeOnce', () => {
  beforeEach(() => {
    resetStores()
  })

  it('on a first launch places one Welcome Card in the store language, saves the key, and has the first view show it', () => {
    useAppStore.setState({ language: 'en' })
    placeWelcomeOnce()

    expect(cards()).toHaveLength(1)
    const [card] = cards()
    expect(card.title).toBe(welcomeContent('en').title)
    expect(card.areaId).toBe('a1')
    expect(localStorage.getItem(WELCOME_PLACED_KEY)).toBe('1')
    expect(useDeskStore.getState().focusCardId).toBe(card.id)
  })

  it('does nothing once the device had its Welcome Card', () => {
    localStorage.setItem(WELCOME_PLACED_KEY, '1')
    placeWelcomeOnce()

    expect(cards()).toEqual([])
    expect(useDeskStore.getState().focusCardId).toBeNull()
  })

  it("on a device already in use, places one on top and changes none of the user's Cards", () => {
    const own = [makeCard({ id: 'c1', title: 'Viaje', position: { z: 3 } }), makeCard({ id: 'c2', areaId: 'a2', position: { z: 8 } })]
    resetStores({ cards: own })
    placeWelcomeOnce()

    expect(cards()).toHaveLength(3)
    expect(cards().slice(0, 2)).toEqual(own)
    expect(cards()[2].position.z).toBe(9)
  })

  it('places it only once across launches', () => {
    placeWelcomeOnce()
    placeWelcomeOnce()
    expect(cards()).toHaveLength(1)
  })
})
