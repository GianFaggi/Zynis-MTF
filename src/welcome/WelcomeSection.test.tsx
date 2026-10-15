import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStores } from '../test/stores'
import { WelcomeSection } from './WelcomeSection'

describe('WelcomeSection', () => {
  beforeEach(() => {
    resetStores()
  })

  it('has its heading and "Ver introducción", which asks for a new Welcome Card', async () => {
    const onShow = vi.fn()
    render(<WelcomeSection onShow={onShow} />)

    expect(screen.getByText('Introducción')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver introducción' }))
    expect(onShow).toHaveBeenCalledTimes(1)
  })

  it('uses no accent: nothing has been done yet', () => {
    const { container } = render(<WelcomeSection onShow={() => {}} />)
    expect(container.innerHTML).not.toMatch(/accent/)
  })
})
