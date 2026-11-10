import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { TextField } from './TextField'

function Password() {
  const [value, setValue] = useState('')
  return (
    <TextField
      label="Contraseña"
      type="password"
      value={value}
      onChange={setValue}
      autoComplete="current-password"
      hint="Al menos 8 caracteres."
      reveal={{ show: 'Mostrar', hide: 'Ocultar' }}
    />
  )
}

describe('TextField', () => {
  it('is named by its label and marked for password managers', () => {
    render(<TextField label="Email" type="email" value="" onChange={() => {}} autoComplete="email" />)

    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('autocomplete', 'email')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('reports what is typed', async () => {
    render(<Password />)

    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123')

    expect(screen.getByLabelText('Contraseña')).toHaveValue('secreto123')
  })

  it('shows and hides a password', async () => {
    render(<Password />)
    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('describes the field with its hint', () => {
    render(<Password />)

    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription('Al menos 8 caracteres.')
  })

  it('never uses the accent', () => {
    const { container } = render(<Password />)

    expect(container.innerHTML).not.toMatch(/accent/)
  })
})
