import type { Rect } from '../desk/geometry'
import { useDeskStore } from '../desk/deskStore'
import { useT } from '../i18n'
import type { AreaColor, Card } from '../types'
import { JarGlass } from './JarGlass'
import { captionRect } from './jarLayout'
import { useWinStats } from './useWinStats'

type JarProps = {
  rect: Rect
  /** The Cards in the Jar, oldest first. */
  cards: readonly Card[]
  colorOf: (areaId: string) => AreaColor
}

/**
 * The Jar on the Desk (KB/frontend/desk.md): every Card in the Jar, a label with how
 * many there are, and the week's count below. A pointer tap is handled by the Desk's
 * gesture controller (a press here may also start a pan); the button's own click only
 * handles the keyboard. `data-jar=""` tells it apart from the Area Jars, which carry
 * their Area's id. The Desk writes `data-over` on it while a dragged Card is over it.
 */
export function Jar({ rect, cards, colorOf }: JarProps) {
  const t = useT()
  const week = useWinStats().week.done
  const caption = captionRect(rect)

  return (
    <>
      <button
        type="button"
        data-jar=""
        aria-label={t('jarName', cards.length)}
        onClick={(event) => {
          if (event.detail === 0) useDeskStore.getState().openWins()
        }}
        className="group/jar absolute cursor-pointer rounded-3xl"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      >
        <JarGlass cards={cards} colorOf={colorOf} />
      </button>
      <p
        className="pointer-events-none absolute text-center font-display text-2xl leading-[1.3] font-medium text-ink-2 italic"
        style={{ left: caption.x, top: caption.y, width: caption.w }}
      >
        {t('jarCaption')}
        <small className="mt-1 block font-ui text-[15px] leading-[1.4] font-medium text-pencil not-italic">{t('jarWeek', week)}</small>
      </p>
    </>
  )
}
