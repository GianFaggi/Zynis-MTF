import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { HINT_SEEN_KEY } from '../lib/storage'
import { resetStores } from '../test/stores'
import { FirstRunHint } from './FirstRunHint'

const hint = /Arrastrá las tarjetas a donde quieras/

describe('FirstRunHint', () => {
  beforeEach(() => {
    resetStores()
  })

  it('shows on a first launch, with a button to dismiss it', () => {
    render(<FirstRunHint />)
    expect(screen.getByRole('note')).toHaveTextContent(hint)
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument()
  })

  it('once dismissed, it is gone and stays gone on the next launch', async () => {
    const { unmount } = render(<FirstRunHint />)
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(localStorage.getItem(HINT_SEEN_KEY)).toBe('1')

    unmount()
    render(<FirstRunHint />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})
