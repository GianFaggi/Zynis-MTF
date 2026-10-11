import { useState } from 'react'
import type { Rect } from '../desk/geometry'
import { useDeskStore } from '../desk/deskStore'
import { useT } from '../i18n'
import type { AreaColor, Card } from '../types'
import { captionRect, jarPieces } from './jarLayout'
import { useWinStats } from './useWinStats'

/** The glass, in the SVG's 260 × 300 box; also clips the pieces. */
const GLASS = 'M48 80 Q40 80 40 94 L40 272 Q40 292 60 292 L200 292 Q220 292 220 272 L220 94 Q220 80 212 80 Z'
const OUTLINE = 'stroke-[color:color-mix(in_oklab,var(--color-pencil)_75%,transparent)] stroke-[2.5]'

type JarProps = {
  rect: Rect
  /** The Cards in the Jar, oldest first. */
  cards: readonly Card[]
  colorOf: (areaId: string) => AreaColor
}

/**
 * The Jar on the Desk (KB/frontend/desk.md): one paper piece per Card in it, in its
 * Area color, a label with how many there are, and the week's count below. A pointer
 * tap is handled by the Desk's gesture controller (a press here may also start a pan);
 * the button's own click only handles the keyboard. The Desk writes `data-over` on it
 * while a dragged Card is over it.
 */
export function Jar({ rect, cards, colorOf }: JarProps) {
  const t = useT()
  const week = useWinStats().week.done
  const fresh = useFreshIds(cards)
  const pieces = jarPieces(cards.map((card) => colorOf(card.areaId)))
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
        <svg
          viewBox="0 0 260 300"
          aria-hidden="true"
          className="size-full overflow-visible transition-transform duration-200 group-data-over/jar:scale-105"
        >
          <defs>
            <clipPath id="jar-glass">
              <path d={GLASS} />
            </clipPath>
          </defs>
          <rect x="66" y="20" width="128" height="30" rx="8" className="fill-[color:color-mix(in_oklab,var(--color-accent)_70%,var(--color-ink))]" />
          <path d="M80 50 L180 50 L188 80 L72 80 Z" className={`fill-glass ${OUTLINE}`} />
          <path
            d={GLASS}
            className={`fill-glass ${OUTLINE} transition-[stroke] duration-200 group-data-over/jar:stroke-accent group-data-over/jar:stroke-4`}
          />
          <g clipPath="url(#jar-glass)">
            {pieces.map((piece, i) => (
              <g key={cards[i].id} className={fresh.has(cards[i].id) ? 'animate-drop' : undefined}>
                <rect
                  x={piece.x.toFixed(1)}
                  y={piece.y.toFixed(1)}
                  width="21"
                  height="13"
                  rx="2.5"
                  fill={`var(--color-${piece.color})`}
                  transform={`rotate(${piece.rotate.toFixed(1)} ${(piece.x + 10).toFixed(1)} ${(piece.y + 6).toFixed(1)})`}
                />
              </g>
            ))}
          </g>
          <path d="M58 110 L58 240" className="fill-none stroke-[rgb(255_255_255/.55)] stroke-5 [stroke-linecap:round]" />
          <rect x="80" y="140" width="100" height="64" rx="9" className="fill-sheet stroke-rule" />
          <text x="130" y="164" textAnchor="middle" className="fill-pencil font-ui text-[11px] font-semibold tracking-[.12em] uppercase">
            {t('jarLabel')}
          </text>
          <text x="130" y="192" textAnchor="middle" className="fill-accent-ink font-display text-[26px] font-semibold tabular-nums">
            {cards.length}
          </text>
        </svg>
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

/**
 * Ids of the Cards that came into the Jar since the previous render, so only their
 * pieces drop in. Kept in state (React's "previous render" pattern) rather than a ref,
 * so it is right even when React renders twice; on the first render nothing is fresh.
 */
function useFreshIds(cards: readonly Card[]): ReadonlySet<string> {
  const ids = cards.map((card) => card.id).join(' ')
  const [seen, setSeen] = useState({ ids, fresh: new Set<string>() })
  if (seen.ids !== ids) {
    const before = new Set(seen.ids.split(' '))
    setSeen({ ids, fresh: new Set(cards.filter((card) => !before.has(card.id)).map((card) => card.id)) })
  }
  return seen.fresh
}
