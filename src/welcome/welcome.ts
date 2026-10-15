import { useDeskStore } from '../desk/deskStore'
import { translate } from '../i18n'
import { loadWelcomePlaced, saveWelcomePlaced } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import type { Language } from '../types'
import type { WelcomeContent } from './welcomeCard'

/** The Welcome Card's text in `language`. Translated here, not in the store, which cannot import i18n. */
export function welcomeContent(language: Language): WelcomeContent {
  return {
    title: translate(language, 'welcomeTitle'),
    body: translate(language, 'welcomeBody'),
    items: [translate(language, 'welcomeDrag'), translate(language, 'welcomeCheck'), translate(language, 'welcomeJar')],
  }
}

/** A new Welcome Card in the current UI language, on top in the first Area. Returns its id. */
export function placeWelcome(): string | undefined {
  const { language, placeWelcomeCard } = useAppStore.getState()
  return placeWelcomeCard(welcomeContent(language))
}

/**
 * The first launch on this device (also one already in use) gets a Welcome Card, and
 * the first view shows it. Called once per page load from `main.tsx`, outside React,
 * so StrictMode and re-renders cannot place it twice.
 */
export function placeWelcomeOnce(): void {
  if (loadWelcomePlaced()) return
  const id = placeWelcome()
  saveWelcomePlaced()
  if (id) useDeskStore.getState().setFocusCard(id)
}
