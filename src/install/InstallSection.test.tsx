import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { USER_AGENTS, restoreDevice, stubDevice } from '../test/device'
import { resetStores } from '../test/stores'
import { useInstallStore, type BeforeInstallPromptEvent } from './installStore'
import { InstallSection } from './InstallSection'

function offerInstall() {
  const promptEvent = Object.assign(new Event('beforeinstallprompt'), { prompt: vi.fn(async () => {}) })
  useInstallStore.setState({ promptEvent: promptEvent as BeforeInstallPromptEvent })
  return promptEvent
}

describe('InstallSection', () => {
  beforeEach(() => {
    resetStores()
    useInstallStore.setState(useInstallStore.getInitialState(), true)
  })

  afterEach(() => {
    restoreDevice()
    vi.restoreAllMocks()
  })

  it('always says why installing keeps the notes safer', () => {
    stubDevice()
    render(<InstallSection />)
    expect(screen.getByText('Instalar la app')).toBeInTheDocument()
    expect(screen.getByText(/tus notas están más seguras/)).toBeInTheDocument()
  })

  it("on an iPhone, Safari's steps", () => {
    stubDevice({ userAgent: USER_AGENTS.iphone, touchPoints: 5 })
    render(<InstallSection />)
    expect(screen.getAllByRole('listitem').map((step) => step.textContent?.trim())).toEqual([
      'Tocá Compartir',
      'Elegí “Agregar a inicio”.',
      'Abrí MTF desde el ícono.',
    ])
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it("where the browser offers installing, a button that opens its dialog, then the installed line", async () => {
    stubDevice({ userAgent: USER_AGENTS.android, touchPoints: 5 })
    const promptEvent = offerInstall()
    render(<InstallSection />)

    const button = screen.getByRole('button', { name: 'Instalar MTF' })
    expect(button.className).not.toMatch(/accent/)
    await userEvent.click(button)
    expect(promptEvent.prompt).toHaveBeenCalledTimes(1)

    act(() => useInstallStore.setState({ installed: true }))
    expect(screen.getByText('MTF ya está instalada en este dispositivo.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('launched from the icon, only the installed line', () => {
    stubDevice({ userAgent: USER_AGENTS.android, touchPoints: 5, displayStandalone: true })
    offerInstall()
    render(<InstallSection />)
    expect(screen.getByText('MTF ya está instalada en este dispositivo.')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('anywhere else, where to look in the browser menu', () => {
    stubDevice({ userAgent: USER_AGENTS.windows })
    render(<InstallSection />)
    expect(screen.getByText(/Abrí el menú del navegador/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
