import { create } from 'zustand'
import type { DeskSummary } from './firstSignIn'

// What the UI shows about sync (#37, design D5, D14). Written only by `engine.ts`; never saved
// (the engine keeps its own state in `mtf_sync`).

/** The first sign-in dialog: both sides' numbers, and whether the copy of this Desk fit. */
export interface SyncChoice {
  local: DeskSummary
  remote: DeskSummary
  /** The copy of this Desk did not fit on the device: Usar el de la cuenta waits for an Export. */
  noRoom: boolean
  /** An Export was made after `noRoom`, so Usar el de la cuenta may go ahead without the copy. */
  exported: boolean
}

export interface SyncUiState {
  /** A sync request is running; the tools pill shows the indicator once it lasts 2 s. */
  syncing: boolean
  /** When the last sync finished (epoch ms). */
  lastSyncAt: number | null
  /** Changes waiting to be sent. */
  pendingCount: number
  choice: SyncChoice | null
  /** Until when "Recuperar el escritorio anterior" is offered (epoch ms); `null` when there is no copy. */
  replacedUntil: number | null
}

export function initialSyncUiState(): SyncUiState {
  return { syncing: false, lastSyncAt: null, pendingCount: 0, choice: null, replacedUntil: null }
}

export const useSyncStore = create<SyncUiState>()(initialSyncUiState)
