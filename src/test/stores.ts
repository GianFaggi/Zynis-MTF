import { initialAccountState, useAccountStore } from '../account/accountStore'
import { useDeskStore } from '../desk/deskStore'
import { DEFAULT_PENS } from '../ink/constants'
import { useAppStore } from '../store/appStore'
import { initialSyncUiState, useSyncStore } from '../sync/syncStore'
import type { MtfData } from '../types'
import { makeData, rowOfAreas } from './fixtures'

// The app's stores are module singletons, so component tests reset them first:
// Spanish, the System theme, no saved arrangement, Area Jars and handwriting off, the default pens, the three default Areas (readable ids a1–a3), a fresh Desk view, no account, and no sync.
export function resetStores(data: Partial<MtfData> = {}) {
  useAppStore.setState({ language: 'es', theme: 'system', arrangement: null, areaJars: false, handwriting: false, pens: DEFAULT_PENS, data: makeData({ areas: rowOfAreas(), ...data }) })
  useDeskStore.setState(useDeskStore.getInitialState(), true)
  useAccountStore.setState(initialAccountState(), true)
  useSyncStore.setState(initialSyncUiState(), true)
}
