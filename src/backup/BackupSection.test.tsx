import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import { makeCard, makeData, makeItem, rowOfAreas } from '../test/fixtures'
import { resetStores } from '../test/stores'
import type { MtfData } from '../types'
import { makeBackup } from './backup'
import { BackupSection } from './BackupSection'
import { deliverFile } from './deliver'

vi.mock('./deliver', () => ({ deliverFile: vi.fn(async () => 'downloaded') }))

const theirs: MtfData = makeData({
  areas: rowOfAreas(),
  cards: [
    makeCard({ id: 't1', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true })] }),
    makeCard({ id: 't2', areaId: 'a2', title: 'Viaje' }),
    makeCard({ id: 't3', areaId: 'a3', title: 'Banco', jarredAt: 5 }),
  ],
  events: [
    { id: 'e1', type: 'item', at: 1, cardId: 't1', itemId: 'i1' },
    { id: 'e2', type: 'card', at: 2, cardId: 't1' },
    { id: 'e3', type: 'card', at: 5, cardId: 't3' },
    { id: 'e4', type: 'note', at: 6, cardId: 't2' },
  ],
})

const jsonFile = (text: string, name = 'mtf-backup-2026-10-11.json') => new File([text], name, { type: 'application/json' })

function setup() {
  const onImported = vi.fn()
  render(<BackupSection onImported={onImported} />)
  const pick = (file: File) => userEvent.upload(screen.getByLabelText('Importar copia'), file)
  return { onImported, pick }
}

describe('BackupSection', () => {
  beforeEach(() => {
    resetStores({ cards: [makeCard({ id: 'mine', title: 'Solo acá' })] })
    vi.mocked(deliverFile).mockClear()
  })

  it('shows the note and the Export and Import buttons, without the accent', () => {
    setup()
    expect(screen.getByText(/Tus notas se guardan en este navegador/)).toBeInTheDocument()
    for (const name of ['Exportar copia', 'Importar copia']) {
      expect(screen.getByRole('button', { name }).className).not.toMatch(/accent/)
    }
  })

  it('Export hands the Backup file over and confirms it with a toast naming the file', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Exportar copia' }))

    const file = vi.mocked(deliverFile).mock.calls[0][0]
    expect(file.name).toMatch(/^mtf-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(JSON.parse(await file.text())).toMatchObject({ format: 'mtf-backup', data: useAppStore.getState().data })
    await waitFor(() => expect(useDeskStore.getState().toast).toMatchObject({ title: 'Copia lista', detail: file.name }))
  })

  it('no toast when the share sheet was closed', async () => {
    vi.mocked(deliverFile).mockResolvedValueOnce('cancelled')
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Exportar copia' }))
    await Promise.resolve()
    expect(useDeskStore.getState().toast).toBeNull()
  })

  it.each([
    ['a file that is not an MTF Backup', JSON.stringify({ name: 'package', version: '1.0.0' }), /no es una copia de MTF/],
    ['a Backup from a newer MTF', makeBackup({ ...theirs, schemaVersion: 99 }, new Date()), /versión más nueva de MTF/],
    ['a damaged Backup', makeBackup({ ...theirs, cards: [{ ...theirs.cards[0], areaId: 'gone' }] }, new Date()), /dañada/],
  ])('refuses %s with a message and leaves the data untouched', async (_, text, message) => {
    const before = useAppStore.getState().data
    const { pick, onImported } = setup()
    await pick(jsonFile(text, 'algo.json'))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('alert')).toHaveTextContent('Tus datos no cambiaron')
    expect(useAppStore.getState().data).toBe(before)
    expect(onImported).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Importar copia' })).toBeInTheDocument()
  })

  it('a valid Backup shows what it holds and asks before replacing', async () => {
    const { pick } = setup()
    await pick(jsonFile(makeBackup(theirs, new Date('2026-10-11T12:00:00Z'))))

    const heading = await screen.findByRole('heading', { name: 'Copia del 11 de octubre de 2026' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('2 tarjetas en el escritorio')).toBeInTheDocument()
    expect(screen.getByText('1 tarjeta en el frasco')).toBeInTheDocument()
    expect(screen.getByText('3 cosas hechas')).toBeInTheDocument()
    expect(screen.getByText(/Reemplaza todo lo que hay en este dispositivo \(1 tarjeta\)/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Importar copia' })).not.toBeInTheDocument()
  })

  it('Cancel leaves the data unchanged and brings the buttons back', async () => {
    const before = useAppStore.getState().data
    const { pick, onImported } = setup()
    await pick(jsonFile(makeBackup(theirs, new Date())))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(useAppStore.getState().data).toBe(before)
    expect(onImported).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Importar copia' })).toBeInTheDocument()
  })

  it('confirming replaces the data with the Backup and reports it', async () => {
    const { pick, onImported } = setup()
    await pick(jsonFile(makeBackup(theirs, new Date())))
    await userEvent.click(await screen.findByRole('button', { name: 'Reemplazar mis datos' }))

    expect(useAppStore.getState().data).toEqual(theirs)
    expect(onImported).toHaveBeenCalledWith(theirs)
  })

  it('picking the same file again, after cancelling, reads it again', async () => {
    const { pick } = setup()
    const file = jsonFile(makeBackup(theirs, new Date()))
    await pick(file)
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect((screen.getByLabelText('Importar copia') as HTMLInputElement).value).toBe('')

    await pick(file)
    expect(await screen.findByRole('button', { name: 'Reemplazar mis datos' })).toBeInTheDocument()
  })
})
