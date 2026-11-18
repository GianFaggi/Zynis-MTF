import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { initialAccountState, useAccountStore } from '../account/accountStore'
import { saveSession } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { recoverPrevious, syncNow } from './engine'
import { SyncStatus } from './SyncStatus'
import { useSyncStore } from './syncStore'

vi.mock('./engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./engine')>()),
  syncNow: vi.fn(async () => {}),
  recoverPrevious: vi.fn(),
}))

const DAY = 24 * 60 * 60 * 1000

describe('SyncStatus', () => {
  beforeEach(() => {
    resetStores()
    vi.mocked(syncNow).mockClear()
    vi.mocked(recoverPrevious).mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the last sync and how many changes go up next, in calm words', () => {
    useSyncStore.setState({ lastSyncAt: Date.now() - 5 * 60_000, pendingCount: 3 })
    render(<SyncStatus />)
    expect(screen.getByText('Última sincronización: hace 5 minutos')).toBeInTheDocument()
    expect(screen.getByText('3 cambios se suben en la próxima sincronización.')).toBeInTheDocument()
  })

  it('shows only the last sync when nothing is pending', () => {
    useSyncStore.setState({ lastSyncAt: Date.now() - 5 * 60_000, pendingCount: 0 })
    render(<SyncStatus />)
    expect(screen.getByText('Última sincronización: hace 5 minutos')).toBeInTheDocument()
    expect(screen.queryByText(/se sube/)).not.toBeInTheDocument()
  })

  it('says it in English', () => {
    useAppStore.setState({ language: 'en' })
    useSyncStore.setState({ lastSyncAt: Date.now() - 5 * 60_000, pendingCount: 1 })
    render(<SyncStatus />)
    expect(screen.getByText('Last sync: 5 minutes ago')).toBeInTheDocument()
    expect(screen.getByText('1 change goes up on the next sync.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument()
  })

  it('Sincronizar ahora syncs, and waits while a sync runs', async () => {
    const { rerender } = render(<SyncStatus />)
    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar ahora' }))
    expect(syncNow).toHaveBeenCalledTimes(1)

    useSyncStore.setState({ syncing: true })
    rerender(<SyncStatus />)
    expect(screen.getByRole('button', { name: 'Sincronizar ahora' })).toBeDisabled()
  })

  it('offers Recuperar el escritorio anterior only during the 30 days', async () => {
    useSyncStore.setState({ replacedUntil: Date.now() + 10 * DAY })
    const { rerender } = render(<SyncStatus />)
    await userEvent.click(screen.getByRole('button', { name: 'Recuperar el escritorio anterior' }))
    expect(recoverPrevious).toHaveBeenCalled()

    useSyncStore.setState({ replacedUntil: Date.now() - DAY })
    rerender(<SyncStatus />)
    expect(screen.queryByRole('button', { name: 'Recuperar el escritorio anterior' })).not.toBeInTheDocument()
  })

  it('never uses a warning color', () => {
    useSyncStore.setState({ lastSyncAt: Date.now(), pendingCount: 4, replacedUntil: Date.now() + DAY })
    const { container } = render(<SyncStatus />)
    expect(container.innerHTML).not.toMatch(/accent|danger/)
  })

  it('appears in Settings while signed in, with no network request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    saveSession({ refreshToken: 'rt-1', email: 'ana@example.com' })
    useAccountStore.setState(initialAccountState(), true)
    useSyncStore.setState({ lastSyncAt: Date.now() - 2 * 60_000, pendingCount: 2, replacedUntil: Date.now() + DAY })
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    const settings = screen.getByRole('dialog', { name: 'Ajustes' })

    expect(within(settings).getByText('Última sincronización: hace 2 minutos')).toBeInTheDocument()
    expect(within(settings).getByText('2 cambios se suben en la próxima sincronización.')).toBeInTheDocument()
    expect(within(settings).getByRole('button', { name: 'Sincronizar ahora' })).toBeInTheDocument()
    expect(within(settings).getByRole('button', { name: 'Recuperar el escritorio anterior' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is not in Settings with no session', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(screen.queryByRole('button', { name: 'Sincronizar ahora' })).not.toBeInTheDocument()
  })
})
