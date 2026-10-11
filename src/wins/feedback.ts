import { useDeskStore } from '../desk/deskStore'
import { prefersReducedMotion } from '../desk/dom'
import { useT } from '../i18n'
import { useAppStore, type ToggleOutcome } from '../store/appStore'
import { burst } from './sparks'
import { winStats } from './stats'

// Store actions return what happened; components turn that into feedback here, so the
// saved-data store never knows about toasts, sparks or the DOM.

/** The finished Card's pop (0.6 s) and seal stamp (0.12 s + 0.45 s), plus a little slack. */
const CELEBRATE_MS = 700

/**
 * Plays the finished Card's one-time pop and stamp: `data-celebrate` on the Card for a
 * moment. Set from here, on the `'finished'` outcome, and not from a CSS rule keyed on
 * "finished", which would also play for every finished Card on load. React never
 * renders this attribute, so a re-render leaves it alone.
 */
function celebrate(cardId: string) {
  if (prefersReducedMotion()) return
  const card = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`)
  if (!card) return
  card.setAttribute('data-celebrate', '')
  setTimeout(() => card.removeAttribute('data-celebrate'), CELEBRATE_MS)
}

export interface WinFeedback {
  /** After `toggleItem`: a check bumps the counter; a check that finished the Card also celebrates it, with sparks from `box`. */
  itemToggled: (outcome: ToggleOutcome | undefined, cardId: string, box?: Element | null) => void
  /** After `jarCard` accepted a Card: sparks over the Jar, bump, toast with the week's count. */
  jarred: () => void
  /** The Jar refused a Card: how many Items are still to check. */
  refused: (pending: number) => void
}

export function useWinFeedback(): WinFeedback {
  const t = useT()
  const { showToast, bumpWins } = useDeskStore.getState()
  return {
    itemToggled: (outcome, cardId, box) => {
      if (outcome !== 'checked' && outcome !== 'finished') return
      bumpWins()
      if (outcome === 'finished') {
        celebrate(cardId)
        burst(box?.getBoundingClientRect())
        showToast(t('cardDone'), t('cardDoneDetail'))
      }
    },
    jarred: () => {
      burst(document.querySelector('[data-jar]')?.getBoundingClientRect())
      bumpWins()
      const { done } = winStats(useAppStore.getState().data.events, Date.now()).week
      showToast(t('jarred'), t('jarredDetail', done))
    },
    refused: (pending) => showToast(t('notYet'), t('pending', pending)),
  }
}
