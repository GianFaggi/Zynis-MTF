import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deliverFile } from '../backup/deliver'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { chooseAccount, chooseUpload, closeChoice } from './engine'
import { SyncChoice } from './SyncChoice'
import { useSyncStore, type SyncChoice as Choice } from './syncStore'

vi.mock('./engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./engine')>()),
  chooseAccount: vi.fn(),
  chooseUpload: vi.fn(),
  closeChoice: vi.fn(),
}))
vi.mock('../backup/deliver', () => ({ deliverFile: vi.fn(async () => 'downloaded') }))

const HOUR = 60 * 60 * 1000

function ask(overrides: Partial<Choice> = {}) {
  useSyncStore.setState({
    choice: {
      local: { desk: 4, jar: 2, areas: 3, updatedAt: Date.now() - 2 * HOUR },
      remote: { desk: 12, jar: 1, areas: 5, updatedAt: Date.now() - 24 * HOUR },
      noRoom: false,
      exported: false,
      ...overrides,
    },
  })
  return render(<SyncChoice />)
}

const dialog = () => screen.getByRole('dialog', { name: '¿Con qué escritorio seguimos?' })

describe('SyncChoice', () => {
  beforeEach(() => {
    resetStores()
    vi.mocked(chooseAccount).mockClear()
    vi.mocked(chooseUpload).mockClear()
    vi.mocked(closeChoice).mockClear()
    vi.mocked(deliverFile).mockClear()
  })

  it('is closed while there is nothing to choose', () => {
    render(<SyncChoice />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows both sides: Cards on the Desk and in the Jar, Areas and the last change', () => {
    ask()
    const device = within(screen.getByRole('region', { name: 'Este dispositivo' }))
    const account = within(screen.getByRole('region', { name: 'Tu cuenta' }))
    expect(device.getByText('4 tarjetas en el escritorio')).toBeInTheDocument()
    expect(device.getByText('2 tarjetas en el frasco')).toBeInTheDocument()
    expect(device.getByText('3 áreas')).toBeInTheDocument()
    expect(device.getByText('Último cambio: hace 2 horas')).toBeInTheDocument()
    expect(account.getByText('12 tarjetas en el escritorio')).toBeInTheDocument()
    expect(account.getByText('1 tarjeta en el frasco')).toBeInTheDocument()
    expect(account.getByText('5 áreas')).toBeInTheDocument()
    expect(account.getByText('Último cambio: ayer')).toBeInTheDocument()
  })

  it('preselects neither choice: same style, and focus on neither button', () => {
    ask()
    const upload = screen.getByRole('button', { name: 'Subir este' })
    const useAccount = screen.getByRole('button', { name: 'Usar el de la cuenta' })
    expect(upload.className).toBe(useAccount.className)
    expect(upload.className).not.toMatch(/(^| )bg-ink( |$)|accent/)
    expect(document.activeElement).not.toBe(upload)
    expect(document.activeElement).not.toBe(useAccount)
  })

  it('Usar el de la cuenta and Subir este each do what they say', async () => {
    ask()
    await userEvent.click(screen.getByRole('button', { name: 'Usar el de la cuenta' }))
    expect(chooseAccount).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Subir este' }))
    expect(chooseUpload).toHaveBeenCalledTimes(1)
  })

  it('closing without choosing chooses nothing', async () => {
    ask()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Cerrar' }))
    expect(closeChoice).toHaveBeenCalled()
    expect(chooseAccount).not.toHaveBeenCalled()
    expect(chooseUpload).not.toHaveBeenCalled()
  })

  it('with no room for the copy, asks for an Export first and then lets Usar el de la cuenta go ahead', async () => {
    ask({ noRoom: true })
    expect(screen.getByText(/No hay lugar en este dispositivo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Usar el de la cuenta' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Exportar copia' }))

    expect(deliverFile).toHaveBeenCalledWith(expect.objectContaining({ name: expect.stringMatching(/^mtf-backup-/) }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar el de la cuenta' })).toBeEnabled())
  })

  it('a cancelled Export keeps Usar el de la cuenta waiting', async () => {
    vi.mocked(deliverFile).mockResolvedValueOnce('cancelled')
    ask({ noRoom: true })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar copia' }))
    await waitFor(() => expect(deliverFile).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Usar el de la cuenta' })).toBeDisabled()
  })

  it('reads in English', () => {
    useAppStore.setState({ language: 'en' })
    ask()
    expect(screen.getByRole('dialog', { name: 'Which desk do we keep?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Use the account's" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload this one' })).toBeInTheDocument()
  })
})
