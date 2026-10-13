import { Pencil } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useT } from '../i18n'
import type { Area } from '../types'
import { areaName } from './areas'

type AreaRegionProps = {
  area: Area
  /** Cards on the Desk in this Area. */
  count: number
  onFly: (area: Area) => void
  onEdit: (area: Area) => void
}

/**
 * One Area: a soft tint with no border, a large label with its Card count, an edit
 * button and a resize handle. It never clips or arranges the Cards over it.
 *
 * Everything sits in one wrapper at the rect's top-left, sized by `--w` / `--h`, so
 * the Desk moves the whole Area with one `translate` and resizes it by writing
 * `--live-w` / `--live-h`, which win over the stored `--rect-w` / `--rect-h`. It never
 * touches a style React owns. It also writes `data-lifted`, `data-blocked` (over
 * another Area) and `data-returning` (sliding back) on the wrapper. While the world
 * is `data-tidying`, a new `left` / `top` slides with Tidy up's timing, so an
 * arrangement moves the Areas together with their Cards.
 *
 * A pointer press on the label is handled by the Desk's gesture controller (a tap
 * flies, a drag moves the Area, a touch swipe pans); its own click only handles the
 * keyboard. The edit button and the handle exist only in the near look.
 */
export function AreaRegion({ area, count, onFly, onEdit }: AreaRegionProps) {
  const t = useT()
  const { x, y, w, h } = area.rect
  const name = areaName(area, t)
  const style = {
    '--b': `var(--color-${area.color})`,
    '--rect-w': `${w}px`,
    '--rect-h': `${h}px`,
    left: x,
    top: y,
  } as CSSProperties

  return (
    <div
      data-area-id={area.id}
      style={style}
      className="group/area pointer-events-none absolute [--h:var(--live-h,var(--rect-h))] [--w:var(--live-w,var(--rect-w))] group-data-tidying:[transition:left_.5s_cubic-bezier(.3,.7,.2,1),top_.5s_cubic-bezier(.3,.7,.2,1)] data-lifted:[--tint-boost:1.7] data-returning:[transition:translate_.35s_ease]"
    >
      <div
        aria-hidden="true"
        className="area-tint absolute -top-[40px] -left-[60px] h-[calc(var(--h)+80px)] w-[calc(var(--w)+120px)] group-data-blocked/area:outline-3 group-data-blocked/area:outline-pencil group-data-blocked/area:outline-dashed group-data-returning/area:[transition:width_.35s_ease,height_.35s_ease]"
      />
      <div className="absolute top-[10px] left-[40px] flex items-center gap-1 group-data-blocked/area:opacity-50">
        <button
          type="button"
          data-area-label={area.id}
          aria-label={`${name}, ${t('cardCount', count)}`}
          onClick={(event) => {
            if (event.detail === 0) onFly(area)
          }}
          className="pointer-events-auto flex cursor-pointer items-baseline gap-4 rounded-2xl px-3.5 py-2 font-display text-[68px] leading-none font-medium tracking-[-0.01em] whitespace-nowrap text-[color:color-mix(in_oklab,var(--b)_75%,var(--color-ink))] italic group-data-lifted/area:cursor-grabbing hover:bg-hover"
        >
          {name}
          <small className="font-ui text-[22px] leading-none font-semibold text-pencil not-italic tabular-nums">{count}</small>
        </button>
        <button
          type="button"
          aria-label={t('editArea', name)}
          onClick={() => onEdit(area)}
          className="pointer-events-auto grid size-14 cursor-pointer place-items-center rounded-full text-pencil hover:bg-hover hover:text-ink group-data-far:hidden"
        >
          <Pencil size={26} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {/* 56 Desk px: at least 31 screen px at the far-zoom threshold, where it hides. Centered on the corner. */}
      <div
        data-area-resize={area.id}
        aria-hidden="true"
        className="pointer-events-auto absolute top-[calc(var(--h)-28px)] left-[calc(var(--w)-28px)] grid size-14 cursor-nwse-resize place-items-center rounded-full hover:bg-hover group-data-far:hidden group-data-returning/area:[transition:top_.35s_ease,left_.35s_ease]"
      >
        <span className="size-5 rounded-br-md border-r-[3px] border-b-[3px] border-pencil opacity-60" />
      </div>
    </div>
  )
}
