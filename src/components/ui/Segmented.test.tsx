import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Segmented } from './Segmented'

const options = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
] as const

describe('Segmented', () => {
  it('marks the active option with aria-pressed', () => {
    render(<Segmented label="Idioma" options={options} value="es" onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the picked value', async () => {
    const onChange = vi.fn()
    render(<Segmented label="Idioma" options={options} value="es" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(onChange).toHaveBeenCalledWith('en')
  })

  it('shows a color dot only on the options that have one, without changing their names', () => {
    const areas = [
      { value: 'all', label: 'Todas' },
      { value: 'a2', label: 'Vida', dot: 'sand' },
    ] as const
    render(<Segmented label="Área" options={areas} value="a2" onChange={() => {}} />)
    const all = screen.getByRole('button', { name: 'Todas' })
    const life = screen.getByRole('button', { name: 'Vida' })
    expect(all.querySelector('[data-dot]')).toBeNull()
    expect(life.querySelector<HTMLElement>('[data-dot]')!.style.background).toBe('var(--color-sand)')
    expect(all).toHaveAttribute('aria-pressed', 'false')
    expect(life).toHaveAttribute('aria-pressed', 'true')
  })
})
