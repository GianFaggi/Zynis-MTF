import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Callout } from './Callout'

describe('Callout', () => {
  it('shows the message as a note, with its buttons in order and no accent', () => {
    render(
      <Callout
        message="Instalá MTF para que tus notas estén más seguras."
        actions={[
          { label: 'Cómo', onClick: () => {} },
          { label: 'Ahora no', onClick: () => {} },
        ]}
      />,
    )
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Instalá MTF para que tus notas estén más seguras.')
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Cómo', 'Ahora no'])
    expect(note.outerHTML).not.toMatch(/accent/)
  })

  it('each button runs its own action', async () => {
    const how = vi.fn()
    const later = vi.fn()
    render(
      <Callout
        message="Hola"
        actions={[
          { label: 'Cómo', onClick: how },
          { label: 'Ahora no', onClick: later },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(later).toHaveBeenCalledTimes(1)
    expect(how).not.toHaveBeenCalled()
  })
})
