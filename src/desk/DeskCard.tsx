import { Pin } from 'lucide-react'
import { memo, type CSSProperties } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { AreaColor, Card } from '../types'
import { displayTitle, usableItems } from './cardText'
import { useDeskStore } from './deskStore'
import { ItemCheck } from './ItemCheck'
import { matchesQuery } from './search'

const SHOWN_ITEMS = 5

type DeskCardProps = {
  card: Card
  color: AreaColor
}

/**
 * One Card on the Desk. Its position, tilt and stacking order are CSS variables, so a
 * drag can add a `translate` and a `--b-preview` color on top without touching any
 * style React owns. The Desk's `data-far` / `data-tidying` reach it through `group-data-*`.
 */
export const DeskCard = memo(function DeskCard({ card, color }: DeskCardProps) {
  const t = useT()
  const toggleItem = useAppStore((state) => state.toggleItem)
  const openEditor = useDeskStore((state) => state.openEditor)
  const search = useDeskStore((state) => (state.query.trim() ? (matchesQuery(card, state.query) ? 'hit' : 'dim') : undefined))

  const items = usableItems(card)
  const shown = items.slice(0, SHOWN_ITEMS)
  const checked = items.filter((item) => item.done).length
  const { x, y, tilt, z } = card.position
  const style = {
    '--x': `${x}px`,
    '--y': `${y}px`,
    '--tilt': `${tilt}deg`,
    '--z': z,
    '--b': `var(--b-preview, var(--color-${color}))`,
  } as CSSProperties

  return (
    <article
      data-card-id={card.id}
      data-search={search}
      tabIndex={0}
      aria-label={displayTitle(card) || t('card')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) openEditor(card.id)
      }}
      style={style}
      className="card-tint absolute top-0 left-0 z-(--z) w-[236px] cursor-pointer rounded-[14px] border border-[color:color-mix(in_oklab,var(--b)_18%,transparent)] px-[15px] pt-3.5 pb-3 shadow-paper [transform:translate(var(--x),var(--y))_rotate(var(--tilt))] group-data-far:p-[22px] group-data-tidying:transition-transform group-data-tidying:duration-500 group-data-tidying:ease-[cubic-bezier(.3,.7,.2,1)] data-lifted:z-[100000] data-lifted:cursor-grabbing data-lifted:shadow-lift data-lifted:[transform:translate(var(--x),var(--y))_scale(1.04)] data-[search=dim]:opacity-[.18] data-[search=hit]:shadow-[0_0_0_3px_var(--color-ink),var(--shadow-paper)]"
    >
      <p
        aria-hidden="true"
        className="hidden font-display text-[34px] leading-[1.2] font-semibold text-balance [overflow-wrap:anywhere] group-data-far:line-clamp-3"
      >
        {displayTitle(card)}
      </p>

      <div className="flex flex-col gap-2 group-data-far:hidden">
        {card.pinned && (
          <Pin
            size={14}
            role="img"
            aria-label={t('pinned')}
            className="absolute top-[13px] right-3 fill-current text-pencil"
          />
        )}
        {card.title && (
          <h3 className="pr-[18px] font-display text-[16.5px] leading-[1.3] font-semibold text-balance [overflow-wrap:anywhere]">
            {card.title}
          </h3>
        )}
        {card.body && (
          <p className="line-clamp-7 text-[14.5px] whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">{card.body}</p>
        )}
        {shown.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {shown.map((item) => (
              <li key={item.id} className="flex items-start gap-[9px] text-[14.5px] leading-[1.4] [overflow-wrap:anywhere]">
                <span className="mt-px">
                  <ItemCheck done={item.done} label={item.text} onToggle={() => toggleItem(card.id, item.id)} />
                </span>
                <span className={item.done ? 'text-pencil line-through decoration-[color-mix(in_oklab,var(--color-pencil)_60%,transparent)]' : undefined}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        )}
        {items.length > shown.length && <p className="text-[13px] text-pencil">{t('more', items.length - shown.length)}</p>}
        {items.length > 0 && (
          <footer className="text-[12.5px] text-pencil tabular-nums">
            {checked}/{items.length}
          </footer>
        )}
      </div>
    </article>
  )
})
