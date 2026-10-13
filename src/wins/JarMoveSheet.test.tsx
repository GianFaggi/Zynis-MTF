import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStores } from '../test/stores'
import { JarMoveSheet } from './JarMoveSheet'

function renderSheet() {
  const onYes = vi.fn()
  const onNo = vi.fn()
  render(<JarMoveSheet name="Vida" color="sand" onYes={onYes} onNo={onNo} />)
  return { onYes, onNo }
}

describe('JarMoveSheet', () => {
  beforeEach(() => {
    resetStores()
  })

  it('asks about the other Area by name', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: '¿Pasarla a Vida y llevarla al frasco?' })).toBeInTheDocument()
  })

  it('Sí says yes', async () => {
    const { onYes, onNo } = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'Sí' }))
    expect(onYes).toHaveBeenCalledOnce()
    expect(onNo).not.toHaveBeenCalled()
  })

  it('No, Esc and the close button say no', async () => {
    const { onYes, onNo } = renderSheet()
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onNo).toHaveBeenCalledTimes(3)
    expect(onYes).not.toHaveBeenCalled()
  })
})
