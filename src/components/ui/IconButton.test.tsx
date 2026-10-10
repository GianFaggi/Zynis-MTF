import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('exposes its label as the accessible name', () => {
    render(<IconButton label="Ajustes" icon={Settings} />)
    expect(screen.getByRole('button', { name: 'Ajustes' })).toBeInTheDocument()
  })

  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<IconButton label="Ajustes" icon={Settings} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
