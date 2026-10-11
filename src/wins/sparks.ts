import { prefersReducedMotion } from '../desk/dom'

// The mockup's celebration: small dots flying out of a point and fading. Plain DOM,
// outside React, because they live for less than a second and nothing reads them.

const SPARKS = 16
const COLORS = ['accent', 'sage', 'sand', 'sky', 'rose']
/** The `spark` keyframe (0.75 s), plus a little slack. */
const SPARK_MS = 800

/** Sparks from the middle of `rect` (screen px). Nothing under reduced motion. */
export function burst(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'> | undefined) {
  if (!rect || prefersReducedMotion()) return
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  for (let i = 0; i < SPARKS; i++) {
    const angle = (Math.PI * 2 * i) / SPARKS + Math.random() * 0.4
    const distance = 36 + Math.random() * 40
    const spark = document.createElement('span')
    spark.setAttribute('aria-hidden', 'true')
    spark.className = 'pointer-events-none fixed z-31 size-[7px] animate-spark rounded-full'
    spark.style.left = `${x - 3.5}px`
    spark.style.top = `${y - 3.5}px`
    spark.style.background = `var(--color-${COLORS[i % COLORS.length]})`
    spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
    spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`)
    document.body.append(spark)
    setTimeout(() => spark.remove(), SPARK_MS)
  }
}
