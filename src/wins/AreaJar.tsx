import { useDeskStore } from '../desk/deskStore'
import { useT } from '../i18n'
import type { Area, Card } from '../types'
import { JarGlass } from './JarGlass'

type AreaJarProps = {
  area: Area
  /** The Area's name, already translated. */
  name: string
  /** This Area's Cards in the Jar, oldest first. */
  cards: readonly Card[]
}

/**
 * An Area's own small Jar (#19), drawn by `AreaRegion` inside its wrapper, so it moves
 * and resizes with the Area. A view of the same Jar: the Desk Jar holds these Cards
 * too. Its place matches `areaJarRect`, which the Desk uses to drop Cards on it. Like
 * the Desk Jar, a pointer tap is left to the Desk's gesture controller and its own
 * click only handles the keyboard. Hidden in the far look, where it would be too small.
 */
export function AreaJar({ area, name, cards }: AreaJarProps) {
  const t = useT()
  return (
    <button
      type="button"
      data-jar={area.id}
      aria-label={t('areaJarName', name, cards.length)}
      onClick={(event) => {
        if (event.detail === 0) useDeskStore.getState().openWins(area.id)
      }}
      className="group/jar pointer-events-auto absolute top-4 left-[calc(var(--w)-128px)] h-[120px] w-[104px] cursor-pointer rounded-2xl group-data-far:hidden group-data-returning/area:[transition:left_.35s_ease]"
    >
      <JarGlass cards={cards} colorOf={() => area.color} compact />
    </button>
  )
}
