import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { USER_AGENTS, restoreDevice, stubDevice } from '../test/device'
import { install, installMode, listenForInstall, useInstallStore } from './installStore'

/** A `beforeinstallprompt` as Chromium fires it. */
function offerInstall() {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn(async () => {}) })
  window.dispatchEvent(event)
  return event
}

describe('installStore', () => {
  let stopListening: () => void

  beforeEach(() => {
    useInstallStore.setState(useInstallStore.getInitialState(), true)
    stopListening = listenForInstall()
  })

  afterEach(() => {
    stopListening()
    restoreDevice()
    vi.restoreAllMocks()
  })

  it("keeps the browser's install offer and stops its own banner", () => {
    const event = offerInstall()
    expect(event.defaultPrevented).toBe(true)
    expect(useInstallStore.getState().promptEvent).toBe(event)
  })

  it('install() opens the dialog once and drops the offer', () => {
    const event = offerInstall()
    install()
    install()
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(useInstallStore.getState().promptEvent).toBeNull()
  })

  it('an install marks MTF as installed', () => {
    offerInstall()
    window.dispatchEvent(new Event('appinstalled'))
    expect(useInstallStore.getState()).toMatchObject({ installed: true, promptEvent: null })
  })

  it('stops listening when asked', () => {
    stopListening()
    offerInstall()
    expect(useInstallStore.getState().promptEvent).toBeNull()
  })

  describe('installMode', () => {
    it('manual when the browser offers nothing', () => {
      stubDevice({ userAgent: USER_AGENTS.windows })
      expect(installMode()).toBe('manual')
    })

    it('prompt when the browser offers installing', () => {
      stubDevice({ userAgent: USER_AGENTS.android, touchPoints: 5 })
      offerInstall()
      expect(installMode()).toBe('prompt')
    })

    it('ios on an iPhone, before the browser offer', () => {
      stubDevice({ userAgent: USER_AGENTS.iphone, touchPoints: 5 })
      offerInstall()
      expect(installMode()).toBe('ios')
    })

    it('installed above everything: launched from the icon', () => {
      stubDevice({ userAgent: USER_AGENTS.iphone, touchPoints: 5, iosStandalone: true })
      expect(installMode()).toBe('installed')
    })

    it('installed above everything: installed in this session', () => {
      stubDevice({ userAgent: USER_AGENTS.iphone, touchPoints: 5 })
      offerInstall()
      useInstallStore.setState({ installed: true })
      expect(installMode()).toBe('installed')
    })
  })
})
