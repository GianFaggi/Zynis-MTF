import { create } from 'zustand'
import { detectLanguage } from '../i18n/detect'
import { loadData, loadLanguage, saveData, saveLanguage } from '../lib/storage'
import type { Language, MtfData } from '../types'

// The single in-memory source of truth (KB/frontend/architecture.md). Components
// read slices of it; only this store talks to the storage layer. View state
// (pan/zoom, open sheets) never goes into `data`.

export interface AppState {
  data: MtfData
  language: Language
  setLanguage: (language: Language) => void
}

export function createAppStore() {
  const store = create<AppState>()((set) => ({
    data: loadData(),
    language: loadLanguage() ?? detectLanguage(navigator.languages),
    setLanguage: (language) => {
      set({ language })
      saveLanguage(language)
    },
  }))

  // Persist the document whenever it is replaced. Change 2 debounces this while dragging.
  store.subscribe((state, previous) => {
    if (state.data !== previous.data) saveData(state.data)
  })

  return store
}

export const useAppStore = createAppStore()
