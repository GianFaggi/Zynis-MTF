import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PaperPlane } from './PaperPlane'

describe('PaperPlane', () => {
  it('flies along the arc and draws its trail while flying', () => {
    const { container } = render(<PaperPlane flying />)
    expect(container.querySelector('.animate-fly')).not.toBeNull()
    expect(container.querySelector('.animate-trail')).not.toBeNull()
  })

  it('rests mid-arc, on the whole trail, when it is not flying', () => {
    const { container } = render(<PaperPlane flying={false} />)
    expect(container.querySelector('.animate-fly')).toBeNull()
    expect(container.querySelector('.animate-trail')).toBeNull()
    expect(container.querySelector('g')).toHaveAttribute('transform', 'translate(158.4 17.1) rotate(-0.9)')
  })

  it('is hidden from assistive technology', () => {
    const { container } = render(<PaperPlane flying />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('is ink and paper, never the accent', () => {
    for (const flying of [true, false]) {
      const { container } = render(<PaperPlane flying={flying} />)
      expect(container.innerHTML).toMatch(/stroke-ink/)
      expect(container.innerHTML).not.toMatch(/accent/)
    }
  })
})
