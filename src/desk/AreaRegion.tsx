import type { CSSProperties } from 'react'
import { useT } from '../i18n'
import type { Area } from '../types'
import { areaName } from './areas'

type AreaRegionProps = {
  area: Area
  /** Cards on the Desk in this Area. */
  count: number
  onFly: (area: Area) => void
}

/**
 * One Area: a soft tint with no border and a large label with its Card count. It
 * never clips or arranges the Cards over it. A pointer tap on the label is handled
 * by the Desk's gesture controller (a press there may also start a pan); the label's
 * own click only handles the keyboard.
 */
export function AreaRegion({ area, count, onFly }: AreaRegionProps) {
  const t = useT()
  const { x, y, w, h } = area.rect
  const name = areaName(area, t)
  const color = { '--b': `var(--color-${area.color})` } as CSSProperties

  return (
    <>
      <div
        aria-hidden="true"
        className="area-tint pointer-events-none absolute"
        style={{ ...color, left: x - 60, top: y - 40, width: w + 120, height: h + 80 }}
      />
      <button
        type="button"
        data-area-label={area.id}
        aria-label={`${name}, ${t('cardCount', count)}`}
        onClick={(event) => {
          if (event.detail === 0) onFly(area)
        }}
        className="absolute flex cursor-pointer items-baseline gap-4 rounded-2xl px-3.5 py-2 font-display text-[68px] leading-none font-medium tracking-[-0.01em] whitespace-nowrap text-[color:color-mix(in_oklab,var(--b)_75%,var(--color-ink))] italic hover:bg-hover"
        style={{ ...color, left: x + 40, top: y + 10 }}
      >
        {name}
        <small className="font-ui text-[22px] leading-none font-semibold text-pencil not-italic tabular-nums">{count}</small>
      </button>
    </>
  )
}
