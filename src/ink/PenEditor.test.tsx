import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PENS_KEY } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { PenEditor } from './PenEditor'

function renderEditor(chosen: 0 | 1 | 2 | 3) {
  useAppStore.getState().choosePen(chosen)
  const onClose = vi.fn()
  return { ...render(<PenEditor onClose={onClose} />), onClose }
}

describe('PenEditor', () => {
  beforeEach(() => {
    resetStores()
  })

  it('is a dialog named after the pen, with focus inside it', () => {
    renderEditor(1)
    const dialog = screen.getByRole('dialog', { name: 'Editar Lápiz 2' })
    expect(dialog).toHaveFocus()
  })

  it('changing the color applies to the pen at once, and is saved on the device', () => {
    renderEditor(1)
    fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#00ff00' } })
    expect(useAppStore.getState().pens.pens[1].color).toBe('#00ff00')
    expect(JSON.parse(localStorage.getItem(PENS_KEY)!).pens[1].color).toBe('#00ff00')
  })

  it('Tinta’s editor offers no color, only the width', () => {
    renderEditor(0)
    expect(screen.getByRole('dialog', { name: 'Editar Tinta' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Color')).toBeNull()
    expect(screen.getByRole('group', { name: 'Grosor' })).toBeInTheDocument()
  })

  it('"Grueso" sets size 12, "Fino" size 4, and the current width shows as pressed', async () => {
    renderEditor(0)
    expect(screen.getByRole('button', { name: 'Medio' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Grueso' }))
    expect(useAppStore.getState().pens.pens[0]).toEqual({ color: null, size: 12 })
    expect(screen.getByRole('button', { name: 'Grueso' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Fino' }))
    expect(useAppStore.getState().pens.pens[0].size).toBe(4)
  })

  it('the slider sets any step between the presets, and then no preset shows as pressed (design D2)', () => {
    renderEditor(1)
    const slider = screen.getByRole('slider', { name: 'Grosor exacto' })
    expect(slider).toHaveAttribute('min', '2')
    expect(slider).toHaveAttribute('max', '20')
    expect(slider).toHaveValue('7')
    fireEvent.change(slider, { target: { value: '9' } })
    expect(useAppStore.getState().pens.pens[1]).toEqual({ color: '#3a78c2', size: 9 })
    expect(JSON.parse(localStorage.getItem(PENS_KEY)!).pens[1].size).toBe(9)
    for (const name of ['Fino', 'Medio', 'Grueso']) expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('[data-pen-size]')).toHaveTextContent('9')
  })

  it('a preset moves the slider to its step', async () => {
    renderEditor(0)
    fireEvent.change(screen.getByRole('slider', { name: 'Grosor exacto' }), { target: { value: '15' } })
    await userEvent.click(screen.getByRole('button', { name: 'Grueso' }))
    expect(screen.getByRole('slider', { name: 'Grosor exacto' })).toHaveValue('12')
    expect(screen.getByRole('button', { name: 'Grueso' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('never uses the accent', () => {
    renderEditor(1)
    const dialog = screen.getByRole('dialog')
    for (const element of [dialog, ...dialog.querySelectorAll('*')]) expect(element.getAttribute('class') ?? '').not.toMatch(/accent/)
  })

  it('closes with "Listo"', async () => {
    const { onClose } = renderEditor(1)
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Esc, and the Esc never reaches the rest of the page', () => {
    const { onClose } = renderEditor(1)
    const pageEsc = vi.fn()
    document.addEventListener('keydown', pageEsc)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    document.removeEventListener('keydown', pageEsc)
    expect(onClose).toHaveBeenCalledOnce()
    expect(pageEsc).not.toHaveBeenCalled()
  })

  it('closes on a press outside it, but not on a press inside it or on the pen tray', () => {
    const { onClose } = renderEditor(1)
    const tray = document.body.appendChild(Object.assign(document.createElement('button'), { type: 'button' }))
    const trayHost = document.body.appendChild(document.createElement('div'))
    trayHost.dataset.penTray = ''
    trayHost.append(tray)

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Grueso' }))
    fireEvent.pointerDown(tray)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.pointerDown(document.body)
    expect(onClose).toHaveBeenCalledOnce()
    trayHost.remove()
  })

  it('reads in English', () => {
    useAppStore.setState({ language: 'en' })
    renderEditor(0)
    expect(screen.getByRole('dialog', { name: 'Edit Ink' })).toBeInTheDocument()
    for (const name of ['Fine', 'Medium', 'Bold', 'Done']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Width' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Exact width' })).toBeInTheDocument()
  })
})
