import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  it('announces the title and the detail in a polite status region', () => {
    render(<Toast message={{ id: 1, title: '¡Al frasco!', detail: 'Ya van 4 cosas hechas en 7 días' }} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('¡Al frasco!Ya van 4 cosas hechas en 7 días')
  })

  it('keeps an empty region mounted when there is no message', () => {
    render(<Toast message={null} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows only the title when there is no detail', () => {
    render(<Toast message={{ id: 2, title: 'Volvió al escritorio' }} />)
    expect(screen.getByRole('status').querySelectorAll('span')).toHaveLength(0)
  })
})
