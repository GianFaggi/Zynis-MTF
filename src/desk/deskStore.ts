import { create } from 'zustand'
import type { View } from './geometry'

// Desk UI state, never saved (KB/frontend/architecture.md). Shared because the Dock,
// the + button and search live outside the Desk but fly the view or open the editor.
// The Desk applies `view`, `flying` and `tidying` to the DOM through `subscribe()`,
// so moving the view never re-renders React.

/** The world transform transition (0.55 s), plus a little slack. */
const FLY_MS = 600
/** The Card transition while tidying up (0.5 s), plus a little slack. */
const TIDY_MS = 560

export interface DeskState {
  view: View
  /** The view is animating towards a new place. */
  flying: boolean
  /** Cards are animating to their tidy positions. */
  tidying: boolean
  editingId: string | null
  /** The Card just created, whose editor opens with the title focused. */
  newCardId: string | null
  searchOpen: boolean
  query: string

  setView: (view: View) => void
  /** Moves the view with an animation (none with reduced motion: the global CSS drops transitions). */
  flyTo: (view: View) => void
  /** Turns on the Card transition for one Tidy up. */
  animateTidy: () => void
  openEditor: (id: string, options?: { isNew?: boolean }) => void
  closeEditor: () => void
  toggleSearch: () => void
  setQuery: (query: string) => void
}

function createDeskStore() {
  let flyTimer: ReturnType<typeof setTimeout> | undefined
  let tidyTimer: ReturnType<typeof setTimeout> | undefined

  return create<DeskState>()((set) => ({
    view: { x: 0, y: 0, s: 1 },
    flying: false,
    tidying: false,
    editingId: null,
    newCardId: null,
    searchOpen: false,
    query: '',

    setView: (view) => set({ view, flying: false }),
    flyTo: (view) => {
      clearTimeout(flyTimer)
      set({ view, flying: true })
      flyTimer = setTimeout(() => set({ flying: false }), FLY_MS)
    },
    animateTidy: () => {
      clearTimeout(tidyTimer)
      set({ tidying: true })
      tidyTimer = setTimeout(() => set({ tidying: false }), TIDY_MS)
    },
    openEditor: (id, { isNew = false } = {}) => set({ editingId: id, newCardId: isNew ? id : null }),
    closeEditor: () => set({ editingId: null, newCardId: null }),
    toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen, query: '' })),
    setQuery: (query) => set({ query }),
  }))
}

export const useDeskStore = createDeskStore()
