import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InkView } from './InkView'

const ink = { height: 650, strokes: [[10, 10, 50, 200, 40, 50], [300, 300, 80, 320, 340, 20], [500, 500, 50]] }

describe('InkView', () => {
  it('draws one path per stroke, in the ink color, hidden from screen readers', () => {
    const { container } = render(<InkView ink={ink} />)
    const svg = container.querySelector('svg')!
    expect(svg.querySelectorAll('path')).toHaveLength(3)
    expect(svg).toHaveClass('fill-current', 'text-ink')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the box proportions at any width', () => {
    const { container } = render(<InkView ink={ink} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('viewBox', '0 0 1000 650')
    expect(svg.style.aspectRatio).toBe('1000 / 650')
    expect(svg).toHaveClass('w-full', 'h-auto')
  })

  it('with a maximum height, cuts the handwriting off and fades only past that height', () => {
    const { container } = render(<InkView ink={ink} maxHeight={180} />)
    const clip = container.querySelector<HTMLElement>('[data-ink-view]')!
    expect(clip.style.maxHeight).toBe('180px')
    expect(clip).toHaveClass('overflow-hidden')
    // jsdom normalizes the gradient: `to bottom` is the default, `#000` becomes rgb().
    expect(clip.style.maskImage).toBe('linear-gradient(rgb(0, 0, 0) 144px, transparent 180px)')
  })

  it('without a maximum height, has no clip', () => {
    const { container } = render(<InkView ink={ink} />)
    expect(container.querySelector('[data-ink-view]')).toBeNull()
  })
})
