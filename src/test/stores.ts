import { useDeskStore } from '../desk/deskStore'
import { useAppStore } from '../store/appStore'
import type { MtfData } from '../types'
import { makeData, rowOfAreas } from './fixtures'

// The app's stores are module singletons, so component tests reset them first:
// Spanish, the three default Areas (readable ids a1–a3), and a fresh Desk view.
export function resetStores(data: Partial<MtfData> = {}) {
  useAppStore.setState({ language: 'es', data: makeData({ areas: rowOfAreas(), ...data }) })
  useDeskStore.setState(useDeskStore.getInitialState(), true)
}
