import { useAppStore } from '../store/appStore'
import { useDeskStore } from './deskStore'
import { measureCardHeights, viewport } from './dom'
import { deskBounds, fitRect } from './geometry'

// View moves shared by more than one control: the Dock's See all, and the Desk after an Import.

/** Flies the view to fit every Area and every Card ("Ver todo"). */
export function showWholeDesk(): void {
  const { areas, cards } = useAppStore.getState().data
  const bounds = deskBounds(areas, cards, measureCardHeights())
  if (bounds) useDeskStore.getState().flyTo(fitRect(bounds, viewport()))
}
