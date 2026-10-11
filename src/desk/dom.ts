import type { Viewport } from './geometry'

// The only place that reads sizes from the DOM. Card heights depend on content and
// fonts, so they are measured when a rule needs them (drop, Tidy up, See all), never cached.

const WORLD_SELECTOR = '[data-desk-world]'

export function viewport(): Viewport {
  return { w: window.innerWidth, h: window.innerHeight }
}

/**
 * The rendered height of every Card on the Desk, in its near look: when zoomed far
 * out, Cards show only their title, so the far look is switched off while measuring
 * (synchronously, before anything is painted). Cards with no layout are left out,
 * so callers fall back to the default height.
 */
export function measureCardHeights(): Map<string, number> {
  const heights = new Map<string, number>()
  const world = document.querySelector<HTMLElement>(WORLD_SELECTOR)
  if (!world) return heights

  const far = world.hasAttribute('data-far')
  if (far) world.removeAttribute('data-far')
  for (const element of world.querySelectorAll<HTMLElement>('[data-card-id]')) {
    if (element.offsetHeight > 0) heights.set(element.dataset.cardId!, element.offsetHeight)
  }
  if (far) world.setAttribute('data-far', '')
  return heights
}
