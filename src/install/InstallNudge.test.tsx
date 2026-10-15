import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INSTALL_NUDGE_SEEN_KEY } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { USER_AGENTS, restoreDevice, stubDevice } from '../test/device'
import { resetStores } from '../test/stores'
import type { WinEvent } from '../types'
import { welcomeContent } from '../welcome/welcome'
import { useInstallStore, type BeforeInstallPromptEvent } from './installStore'
import { InstallNudge } from './InstallNudge'

const nudge = 'Instalá MTF para que tus notas estén más seguras.'
const iphone = { userAgent: USER_AGENTS.iphone, touchPoints: 5 }

let notes = 0

/** What keeping a new Card does to the data: one more `note` event. */
function keepNewCard() {
  const event: WinEvent = { id: `n${++notes}`, type: 'note', at: Date.now() }
  act(() => {
    const { data } = useAppStore.getState()
    useAppStore.setState({ data: { ...data, events: [...data.events, event] } })
  })
}

function renderNudge() {
  const onHow = vi.fn()
  const view = render(<InstallNudge onHow={onHow} />)
  return { onHow, ...view }
}

describe('InstallNudge', () => {
  beforeEach(() => {
    resetStores({ events: [{ id: 'old', type: 'note', at: 1 }] })
    useInstallStore.setState(useInstallStore.getInitialState(), true)
  })

  afterEach(() => {
    restoreDevice()
    vi.restoreAllMocks()
  })

  it('does not show at launch, even with notes already written', () => {
    stubDevice(iphone)
    renderNudge()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('shows on an iPhone after a new Card is kept', () => {
    stubDevice(iphone)
    renderNudge()
    keepNewCard()
    expect(screen.getByRole('note')).toHaveTextContent(nudge)
  })

  it('shows where the browser offers installing', () => {
    stubDevice({ userAgent: USER_AGENTS.android, touchPoints: 5 })
    useInstallStore.setState({ promptEvent: new Event('beforeinstallprompt') as BeforeInstallPromptEvent })
    renderNudge()
    keepNewCard()
    expect(screen.getByRole('note')).toHaveTextContent(nudge)
  })

  it('does not show where the browser cannot install MTF', () => {
    stubDevice({ userAgent: USER_AGENTS.windows })
    renderNudge()
    keepNewCard()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('does not show in the installed app', () => {
    stubDevice({ ...iphone, iosStandalone: true })
    renderNudge()
    keepNewCard()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('does not show when MTF places a Welcome Card, which the user did not write', () => {
    stubDevice(iphone)
    renderNudge()
    act(() => {
      useAppStore.getState().placeWelcomeCard(welcomeContent('es'))
    })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('"Cómo" opens Settings, and the nudge never comes back', async () => {
    stubDevice(iphone)
    const { onHow, unmount } = renderNudge()
    keepNewCard()
    await userEvent.click(screen.getByRole('button', { name: 'Cómo' }))

    expect(onHow).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(localStorage.getItem(INSTALL_NUDGE_SEEN_KEY)).toBe('1')

    unmount()
    renderNudge()
    keepNewCard()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('"Ahora no" dismisses it for good, also after more Cards', async () => {
    stubDevice(iphone)
    const { onHow } = renderNudge()
    keepNewCard()
    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }))

    expect(onHow).not.toHaveBeenCalled()
    expect(localStorage.getItem(INSTALL_NUDGE_SEEN_KEY)).toBe('1')
    keepNewCard()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('installing hides it and keeps it away', () => {
    stubDevice({ userAgent: USER_AGENTS.android, touchPoints: 5 })
    useInstallStore.setState({ promptEvent: new Event('beforeinstallprompt') as BeforeInstallPromptEvent })
    renderNudge()
    keepNewCard()
    act(() => useInstallStore.setState({ installed: true, promptEvent: null }))

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(localStorage.getItem(INSTALL_NUDGE_SEEN_KEY)).toBe('1')
  })
})
