import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from '../lib/storage'
import { makeCard } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { useAppStore } from './appStore'
import { resetPersistentStorageRequest, usePersistentStorage } from './usePersistentStorage'

vi.mock('../lib/storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/storage')>()),
  requestPersistentStorage: vi.fn(async () => {}),
}))

const addCard = (id: string) =>
  act(() => {
    const { data } = useAppStore.getState()
    useAppStore.setState({ data: { ...data, cards: [...data.cards, makeCard({ id, title: id })] } })
  })

describe('usePersistentStorage', () => {
  beforeEach(() => {
    resetPersistentStorageRequest()
    vi.mocked(requestPersistentStorage).mockClear()
  })

  it('does not ask on an empty Desk', () => {
    resetStores()
    renderHook(() => usePersistentStorage())
    expect(requestPersistentStorage).not.toHaveBeenCalled()
  })

  it('asks once when the first Card appears, and not again after more Cards', () => {
    resetStores()
    renderHook(() => usePersistentStorage())
    addCard('c1')
    expect(requestPersistentStorage).toHaveBeenCalledTimes(1)

    addCard('c2')
    act(() => useAppStore.setState({ data: { ...useAppStore.getState().data, cards: [] } }))
    addCard('c3')
    expect(requestPersistentStorage).toHaveBeenCalledTimes(1)
  })

  it('asks once at launch when there are Cards already', () => {
    resetStores({ cards: [makeCard({ id: 'c1', title: 'Hola' })] })
    const { rerender } = renderHook(() => usePersistentStorage())
    rerender()
    addCard('c2')
    expect(requestPersistentStorage).toHaveBeenCalledTimes(1)
  })
})
