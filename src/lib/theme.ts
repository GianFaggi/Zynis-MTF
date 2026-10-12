import type { Theme } from '../types'

// The only DOM writes for the theme (KB/frontend/design-system.md#how-the-theme-switches).
// `data-theme` on <html> marks a manual choice only: under System there is no attribute
// and the CSS media query decides alone, live. The status bar color comes from the two
// `theme-color` metas in index.html; each keeps its original `content` in
// `data-system-content`, so System can put it back and its `media` query rules again.

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme

  // Read after the attribute is set, so it is the chosen palette's paper. Empty without
  // CSS (jsdom): the metas are then left as they are.
  const paper = theme === 'system' ? '' : getComputedStyle(root).getPropertyValue('--color-paper').trim()
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.dataset.systemContent ??= meta.content
    if (theme === 'system') meta.content = meta.dataset.systemContent
    else if (paper) meta.content = paper
  }
}
