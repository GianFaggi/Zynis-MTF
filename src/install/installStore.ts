import { create } from 'zustand'
import { isIos, isStandalone } from './platform'

// The browser's offer to install MTF (KB/frontend/pwa.md#install-guidance). Chromium
// fires `beforeinstallprompt` when MTF can be installed, possibly before React mounts,
// so `main.tsx` starts listening first. The event is kept to open the dialog later
// from the "Instalar MTF" button; it can be used once.

/** Chromium only; not in TypeScript's DOM types. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<unknown>
}

export interface InstallState {
  promptEvent: BeforeInstallPromptEvent | null
  /** Installed during this session (`appinstalled`). A launch from the icon is `isStandalone()`. */
  installed: boolean
}

export const useInstallStore = create<InstallState>()(() => ({ promptEvent: null, installed: false }))

/** Keeps the install offer and hears about an install. Returns a function that stops listening. */
export function listenForInstall(): () => void {
  const onPrompt = (event: Event) => {
    event.preventDefault() // no mini-infobar: MTF offers it in Settings
    useInstallStore.setState({ promptEvent: event as BeforeInstallPromptEvent })
  }
  const onInstalled = () => useInstallStore.setState({ installed: true, promptEvent: null })
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)
  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  }
}

/** Opens the browser's install dialog with the kept offer, and drops it. */
export function install(): void {
  const { promptEvent } = useInstallStore.getState()
  if (!promptEvent) return
  useInstallStore.setState({ promptEvent: null })
  void promptEvent.prompt()
}

/**
 * What the install guidance shows, in this order of priority: already installed, the
 * iOS steps, the browser's own dialog, or generic steps for the browser menu.
 */
export type InstallMode = 'installed' | 'ios' | 'prompt' | 'manual'

export function installMode({ promptEvent, installed }: InstallState = useInstallStore.getState()): InstallMode {
  if (installed || isStandalone()) return 'installed'
  if (isIos()) return 'ios'
  if (promptEvent) return 'prompt'
  return 'manual'
}

export function useInstallMode(): InstallMode {
  return useInstallStore(installMode)
}
