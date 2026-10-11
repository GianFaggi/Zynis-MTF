import { useEffect } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { useDeskStore } from './deskStore'
import { measureCardHeights, viewport } from './dom'
import { cardView } from './geometry'
import { matchesQuery } from './search'

/** Flies to the first match in Desk order: the Card drawn on top first. */
function flyToFirstMatch(query: string) {
  const match = useAppStore
    .getState()
    .data.cards.filter((card) => card.jarredAt === null && matchesQuery(card, query))
    .sort((a, b) => b.position.z - a.position.z)[0]
  if (match) useDeskStore.getState().flyTo(cardView(match, measureCardHeights().get(match.id), viewport()))
}

/**
 * The search field under the tools pill. Typing outlines matching Cards and dims the
 * rest (DeskCard reads `query`); `Enter` flies to the first match; `Esc` closes and
 * clears it, unless a sheet is open, which owns `Esc`.
 */
export function SearchBox() {
  const t = useT()
  const open = useDeskStore((state) => state.searchOpen)
  const query = useDeskStore((state) => state.query)
  const setQuery = useDeskStore((state) => state.setQuery)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return
      useDeskStore.getState().toggleSearch()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed top-[calc(64px+env(safe-area-inset-top,0px))] right-[calc(14px+env(safe-area-inset-right,0px))] z-10 w-[min(320px,calc(100vw-28px))]">
      <input
        type="search"
        // The field only appears because the user asked to search.
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') flyToFirstMatch(query)
        }}
        placeholder={t('searchField')}
        aria-label={t('searchField')}
        autoComplete="off"
        className="h-[42px] w-full rounded-xl border border-rule bg-sheet px-3.5 shadow-paper outline-none placeholder:text-pencil focus:border-ink [&::-webkit-search-cancel-button]:appearance-none"
      />
    </div>
  )
}
