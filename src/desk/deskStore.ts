import { create } from 'zustand'
import type { ToastMessage } from '../components/ui/Toast'
import type { View } from './geometry'

// Desk UI state, never saved (KB/frontend/architecture.md). Shared because the Dock,
// the + button and search live outside the Desk but fly the view or open the editor.
// The Desk applies `view`, `flying` and `tidying` to the DOM through `subscribe()`,
// so moving the view never re-renders React.

/** The world transform transition (0.55 s), plus a little slack. */
const FLY_MS = 600
/** The Card transition while tidying up (0.5 s), plus a little slack. */
const TIDY_MS = 560
/** How long a toast stays up. */
export const TOAST_MS = 2800

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
  toast: ToastMessage | null
  /** The Mis logros sheet is open. */
  winsOpen: boolean
  /** The Area Mis logros is filtered to (#19); `null` = "Todas". Only read while "Frasco por área" is on. */
  winsAreaId: string | null
  /** Goes up on each new Win; the wins counter remounts its number on it to replay the bump. */
  winsBump: number
  /** The open Area editor; `isNew` for an Area just created, whose name opens selected. */
  areaEditor: { id: string; isNew: boolean } | null
  /** The Card the first view shows instead of the usual one: the Welcome Card placed at this launch (#20). */
  focusCardId: string | null

  setView: (view: View) => void
  /** Moves the view with an animation (none with reduced motion: the global CSS drops transitions). */
  flyTo: (view: View) => void
  /** Turns on the Card transition for one Tidy up. */
  animateTidy: () => void
  openEditor: (id: string, options?: { isNew?: boolean }) => void
  closeEditor: () => void
  toggleSearch: () => void
  setQuery: (query: string) => void
  /** Replaces the current toast, if any, and hides it after 2.8 s. */
  showToast: (title: string, detail?: string) => void
  /** Opens Mis logros on "Todas", or on one Area (an Area Jar). */
  openWins: (areaId?: string | null) => void
  setWinsArea: (areaId: string | null) => void
  closeWins: () => void
  bumpWins: () => void
  openAreaEditor: (id: string, options?: { isNew?: boolean }) => void
  closeAreaEditor: () => void
  setFocusCard: (id: string | null) => void
  /** After an Import: closes the editors, search and Mis logros, which may point at Cards or Areas that are gone. The view is not reset here. */
  resetAfterImport: () => void
}

function createDeskStore() {
  let flyTimer: ReturnType<typeof setTimeout> | undefined
  let tidyTimer: ReturnType<typeof setTimeout> | undefined
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let toastId = 0

  return create<DeskState>()((set) => ({
    view: { x: 0, y: 0, s: 1 },
    flying: false,
    tidying: false,
    editingId: null,
    newCardId: null,
    searchOpen: false,
    query: '',
    toast: null,
    winsOpen: false,
    winsAreaId: null,
    winsBump: 0,
    areaEditor: null,
    focusCardId: null,

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
    // Replaced rather than queued: Wins can come fast, and a queue would lag behind the user.
    showToast: (title, detail) => {
      clearTimeout(toastTimer)
      set({ toast: { id: ++toastId, title, detail } })
      toastTimer = setTimeout(() => set({ toast: null }), TOAST_MS)
    },
    openWins: (areaId = null) => set({ winsOpen: true, winsAreaId: areaId }),
    setWinsArea: (areaId) => set({ winsAreaId: areaId }),
    closeWins: () => set({ winsOpen: false }),
    bumpWins: () => set((state) => ({ winsBump: state.winsBump + 1 })),
    openAreaEditor: (id, { isNew = false } = {}) => set({ areaEditor: { id, isNew } }),
    closeAreaEditor: () => set({ areaEditor: null }),
    setFocusCard: (id) => set({ focusCardId: id }),
    resetAfterImport: () =>
      set({ editingId: null, newCardId: null, areaEditor: null, searchOpen: false, query: '', winsOpen: false }),
  }))
}

export const useDeskStore = createDeskStore()
