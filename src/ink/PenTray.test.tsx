import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PENS_KEY } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { PenTray } from './PenTray'

function renderTray(eraser = false) {
  const onChoose = vi.fn()
  const onEdit = vi.fn()
  const view = render(<PenTray eraser={eraser} onChoose={onChoose} onEdit={onEdit} />)
  return { ...view, onChoose, onEdit }
}

const pressed = () => screen.getAllByRole('button').filter((button) => button.getAttribute('aria-pressed') === 'true')

describe('PenTray', () => {
  beforeEach(() => {
    resetStores()
  })

  it('shows four pens named with their width, Tinta first and chosen on a fresh device', () => {
    renderTray()
    expect(screen.getByRole('group', { name: 'Lápices' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Tinta, Medio',
      'Lápiz 2, Medio',
      'Lápiz 3, Medio',
      'Lápiz 4, Medio',
    ])
    expect(pressed()).toEqual([screen.getByRole('button', { name: 'Tinta, Medio' })])
  })

  it('a tap on another pen chooses it and saves it on the device, without opening the editor', async () => {
    const { onChoose, onEdit } = renderTray()
    await userEvent.click(screen.getByRole('button', { name: 'Lápiz 3, Medio' }))
    expect(useAppStore.getState().pens.chosen).toBe(2)
    expect(JSON.parse(localStorage.getItem(PENS_KEY)!).chosen).toBe(2)
    expect(pressed()).toEqual([screen.getByRole('button', { name: 'Lápiz 3, Medio' })])
    expect(onChoose).toHaveBeenCalledOnce()
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('a tap on the chosen pen opens its editor', async () => {
    const { onChoose, onEdit } = renderTray()
    await userEvent.click(screen.getByRole('button', { name: 'Lápiz 3, Medio' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lápiz 3, Medio' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onChoose).toHaveBeenCalledOnce()
  })

  it('while the eraser is on, no pen is pressed, and a tap on any pen goes back to writing without editing', async () => {
    const { onChoose, onEdit } = renderTray(true)
    expect(pressed()).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: 'Tinta, Medio' }))
    expect(onChoose).toHaveBeenCalledOnce()
    expect(onEdit).not.toHaveBeenCalled()
    expect(useAppStore.getState().pens.chosen).toBe(0)
  })

  it('draws each dot in its pen’s color and sized by its width; Tinta’s dot follows the theme', () => {
    useAppStore.getState().editPen(1, { color: '#123456', size: 12 })
    const { container } = renderTray()
    const dots = [...container.querySelectorAll<HTMLElement>('[data-pen-dot]')]
    expect(dots[0].style.backgroundColor).toBe('')
    expect(dots[0]).toHaveClass('bg-current')
    expect(dots[1].style.backgroundColor).toBe('rgb(18, 52, 86)')
    expect(parseFloat(dots[1].style.width)).toBeGreaterThan(parseFloat(dots[0].style.width))
    expect(screen.getByRole('button', { name: 'Lápiz 2, Grueso' })).toBeInTheDocument()
  })

  it('shows the pencil badge only on the chosen pen, and never uses the accent', () => {
    const { container } = renderTray()
    const badges = container.querySelectorAll('[data-pen-badge]')
    expect(badges).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Tinta, Medio' })).toContainElement(badges[0] as HTMLElement)
    expect(container.innerHTML).not.toMatch(/accent/)
  })

  it('names the pens in English', () => {
    useAppStore.setState({ language: 'en' })
    renderTray()
    expect(screen.getByRole('group', { name: 'Pens' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ink, Medium' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pen 4, Medium' })).toBeInTheDocument()
  })
})
