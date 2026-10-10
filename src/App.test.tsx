import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { LANGUAGE_KEY } from './lib/storage'
import { useAppStore } from './store/appStore'

describe('App', () => {
  beforeEach(() => {
    useAppStore.setState({ language: 'es' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the wordmark and the welcome line', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'mtf' })).toBeInTheDocument()
    expect(screen.getByText('Hola. Tu escritorio de papel ya casi está listo.')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('opens Settings with the language selector', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))

    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switching to English changes every text and the page language, and is remembered', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    await userEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByText('Hi. Your paper desk is almost ready.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en')
  })

  it('closes Settings with Esc', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajustes' })).toHaveFocus()
  })

  it('keeps working when storage refuses to write', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    await userEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByText('Hi. Your paper desk is almost ready.')).toBeInTheDocument()
  })
})
