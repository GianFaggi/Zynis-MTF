import type { CSSProperties } from 'react'
import type { Ink } from '../types'
import { INK_WIDTH } from './constants'
import { inkPaths } from './render'

/** How tall the fade at the bottom of cut-off handwriting is, in px. */
const FADE_PX = 36

type InkViewProps = {
  ink: Ink
  /**
   * Cuts the handwriting off at this height (px) and fades its bottom out. The fade's stops
   * are absolute, so handwriting shorter than the cut is never faded, with no measuring.
   */
  maxHeight?: number
}

/**
 * Handwriting, read-only (#47, design D8): an SVG at 100% of the width it gets, with the
 * box's `viewBox`, so it keeps its proportions and layout on every screen. Tinta strokes
 * have no `fill` and inherit `currentColor`, the ink token, so they follow the theme; a pen's
 * stroke has its own `fill`, the same in both themes (#51).
 */
export function InkView({ ink, maxHeight }: InkViewProps) {
  const svg = (
    <svg
      viewBox={`0 0 ${INK_WIDTH} ${ink.height}`}
      aria-hidden="true"
      focusable="false"
      style={{ aspectRatio: `${INK_WIDTH} / ${ink.height}` }}
      className="block h-auto w-full fill-current text-ink"
    >
      {inkPaths(ink).map(({ d, color }, index) => (
        <path key={index} d={d} fill={color ?? undefined} />
      ))}
    </svg>
  )
  if (maxHeight === undefined) return svg
  const mask = `linear-gradient(to bottom, #000 ${maxHeight - FADE_PX}px, transparent ${maxHeight}px)`
  const style: CSSProperties = { maxHeight, maskImage: mask, WebkitMaskImage: mask }
  return (
    <div data-ink-view="" style={style} className="overflow-hidden">
      {svg}
    </div>
  )
}
