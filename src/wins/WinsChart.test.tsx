import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import type { DayCount } from './stats'
import { WinsChart } from './WinsChart'

// Thursday 8 October 2026 to Wednesday 14 October 2026; today is the Wednesday.
const days: DayCount[] = [0, 2, 0, 0, 1, 0, 4].map((count, i) => ({ start: new Date(2026, 9, 8 + i).getTime(), count }))

describe('WinsChart', () => {
  beforeEach(() => {
    resetStores()
  })

  it('is one accessible image', () => {
    render(<WinsChart days={days} />)
    expect(screen.getByRole('img', { name: 'Cosas hechas por día, últimos 7 días' })).toBeInTheDocument()
  })

  it('labels the 7 days with their weekday, today last', () => {
    const { container } = render(<WinsChart days={days} />)
    const initials = [...container.querySelectorAll('text')].filter((text) => Number(text.getAttribute('y')) === 170)
    expect(initials.map((text) => text.textContent)).toEqual(['J', 'V', 'S', 'D', 'L', 'M', 'X'])
    expect(initials.at(-1)).toHaveClass('fill-accent-ink')
  })

  it('draws a bar with its number only for days with something done; today in the accent', () => {
    const { container } = render(<WinsChart days={days} />)
    const bars = [...container.querySelectorAll('rect')]
    expect(bars).toHaveLength(3)
    expect(bars.map((bar) => bar.getAttribute('class'))).toEqual(['fill-bar', 'fill-bar', 'fill-accent'])
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('uses the English initials in English', () => {
    useAppStore.setState({ language: 'en' })
    const { container } = render(<WinsChart days={days} />)
    const initials = [...container.querySelectorAll('text')].filter((text) => Number(text.getAttribute('y')) === 170)
    expect(initials.map((text) => text.textContent)).toEqual(['T', 'F', 'S', 'S', 'M', 'T', 'W'])
  })
})
