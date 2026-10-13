import { useId, useState } from 'react'
import { useT } from '../i18n'
import type { AreaColor, Card } from '../types'
import { jarPieces } from './jarLayout'

/** The glass, in the SVG's 260 × 300 box; also clips the pieces. */
const GLASS = 'M48 80 Q40 80 40 94 L40 272 Q40 292 60 292 L200 292 Q220 292 220 272 L220 94 Q220 80 212 80 Z'
const OUTLINE = 'stroke-[color:color-mix(in_oklab,var(--color-pencil)_75%,transparent)]'

type JarGlassProps = {
  /** The Cards in the Jar, oldest first. */
  cards: readonly Card[]
  colorOf: (areaId: string) => AreaColor
  /**
   * An Area Jar (#19), drawn at 40%: the count alone, larger, because "Logros" would
   * be about 4 Desk px, and thicker strokes so the outline still reads.
   */
  compact?: boolean
}

/**
 * The Jar's drawing, shared by the Desk Jar and the Area Jars: the lid, the glass with
 * one paper piece per Card in its Area color, the shine and the label with the count.
 * It sits in a `group/jar` button, whose `data-over` (a dragged Card over it) rings the
 * glass in the accent and scales the drawing up a little.
 */
export function JarGlass({ cards, colorOf, compact = false }: JarGlassProps) {
  const t = useT()
  // Unique per Jar: several Jars share the page once each Area has its own.
  const clipId = useId()
  const fresh = useFreshIds(cards)
  const pieces = jarPieces(cards.map((card) => colorOf(card.areaId)))

  return (
    <svg
      viewBox="0 0 260 300"
      aria-hidden="true"
      className="size-full overflow-visible transition-transform duration-200 group-data-over/jar:scale-105"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={GLASS} />
        </clipPath>
      </defs>
      <rect x="66" y="20" width="128" height="30" rx="8" className="fill-[color:color-mix(in_oklab,var(--color-accent)_70%,var(--color-ink))]" />
      <path d="M80 50 L180 50 L188 80 L72 80 Z" className={`fill-glass ${OUTLINE} ${compact ? 'stroke-5' : 'stroke-[2.5]'}`} />
      <path
        d={GLASS}
        className={`fill-glass ${OUTLINE} transition-[stroke] duration-200 group-data-over/jar:stroke-accent ${compact ? 'stroke-5 group-data-over/jar:stroke-[9]' : 'stroke-[2.5] group-data-over/jar:stroke-4'}`}
      />
      <g clipPath={`url(#${clipId})`}>
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
      {compact ? (
        <>
          <rect x="80" y="134" width="100" height="76" rx="12" className="fill-sheet stroke-rule stroke-3" />
          <text x="130" y="190" textAnchor="middle" className="fill-accent-ink font-display text-[50px] font-semibold tabular-nums">
            {cards.length}
          </text>
        </>
      ) : (
        <>
          <rect x="80" y="140" width="100" height="64" rx="9" className="fill-sheet stroke-rule" />
          <text x="130" y="164" textAnchor="middle" className="fill-pencil font-ui text-[11px] font-semibold tracking-[.12em] uppercase">
            {t('jarLabel')}
          </text>
          <text x="130" y="192" textAnchor="middle" className="fill-accent-ink font-display text-[26px] font-semibold tabular-nums">
            {cards.length}
          </text>
        </>
      )}
    </svg>
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
