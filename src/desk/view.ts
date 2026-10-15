import { useAppStore } from '../store/appStore'
import { useDeskStore } from './deskStore'
import { measureCardHeights, viewport } from './dom'
import { deskBounds, fitRect, welcomeView, type View } from './geometry'

// View moves shared by more than one control: the Dock's See all, and the Desk after an Import.
// And the Welcome Card's view, used by the first view and by "Ver introducción".

/** Flies the view to fit every Area and every Card ("Ver todo"). */
export function showWholeDesk(): void {
  const { areas, cards } = useAppStore.getState().data
  const bounds = deskBounds(areas, cards, measureCardHeights())
  if (bounds) useDeskStore.getState().flyTo(fitRect(bounds, viewport()))
}

/** `welcomeView` for the Card `id`; `null` when it is not on the Desk. Without its height (not rendered yet), the default one. */
export function welcomeCardView(id: string | null | undefined, heights: ReadonlyMap<string, number> = new Map()): View | null {
  const { areas, cards } = useAppStore.getState().data
  const card = cards.find((candidate) => candidate.id === id && candidate.jarredAt === null)
  const area = card && areas.find((candidate) => candidate.id === card.areaId)
  return card && area ? welcomeView(area, card, heights.get(card.id), viewport()) : null
}
