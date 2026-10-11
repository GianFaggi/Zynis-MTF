import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Sheet } from './Sheet'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ajustes" closeLabel="Cerrar">
        <p>Contenido</p>
      </Sheet>
    </>
  )
}

async function openSheet() {
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Abrir' })
  await userEvent.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Ajustes' })
  return { trigger, dialog }
}

describe('Sheet', () => {
  it('opens as a labelled modal dialog and takes focus', async () => {
    const { dialog } = await openSheet()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })

  it('closes on Esc and returns focus to the trigger', async () => {
    const { trigger } = await openSheet()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes with the close button and returns focus to the trigger', async () => {
    const { trigger } = await openSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on a scrim click but not on a click inside the sheet', async () => {
    const { trigger, dialog } = await openSheet()
    await userEvent.click(screen.getByText('Contenido'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('renders header actions next to the close button', () => {
    render(
      <Sheet open onClose={() => {}} title="Tarjeta" closeLabel="Cerrar" actions={<button type="button">Fijar</button>}>
        <p>Contenido</p>
      </Sheet>,
    )
    const fix = screen.getByRole('button', { name: 'Fijar' })
    const close = screen.getByRole('button', { name: 'Cerrar' })
    expect(fix.parentElement).toBe(close.parentElement)
    expect(fix.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a hidden title still names the dialog', () => {
    render(
      <Sheet open onClose={() => {}} title="Tarjeta" closeLabel="Cerrar" hideTitle>
        <p>Contenido</p>
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Tarjeta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tarjeta' })).toHaveClass('sr-only')
  })

  it('a tint mixes the Area color into the panel', () => {
    render(
      <Sheet open onClose={() => {}} title="Tarjeta" closeLabel="Cerrar" tint="sand">
        <p>Contenido</p>
      </Sheet>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('card-tint')
    expect(dialog.style.getPropertyValue('--b')).toBe('var(--color-sand)')
  })
})
