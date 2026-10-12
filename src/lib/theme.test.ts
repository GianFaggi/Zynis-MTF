import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme } from './theme'

/** The two metas from index.html. */
function addThemeColorMetas() {
  document.head.innerHTML = `
    <meta name="theme-color" content="#F5F1EA" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1C1A18" media="(prefers-color-scheme: dark)" />`
}

function metaContents() {
  return [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((meta) => meta.content)
}

/** jsdom loads no CSS, so the computed paper is stubbed. */
function paperIs(value: string) {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => value } as unknown as CSSStyleDeclaration)
}

describe('applyTheme', () => {
  beforeEach(addThemeColorMetas)

  afterEach(() => {
    applyTheme('system')
    document.head.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('marks a manual choice on <html> and removes the mark under System', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('paints both status bar metas with the chosen paper', () => {
    paperIs(' #1c1a18')
    applyTheme('dark')
    expect(metaContents()).toEqual(['#1c1a18', '#1c1a18'])
  })

  it('puts the original status bar colors back under System', () => {
    paperIs('#1c1a18')
    applyTheme('dark')
    paperIs('#f5f1ea')
    applyTheme('light')
    applyTheme('system')
    expect(metaContents()).toEqual(['#F5F1EA', '#1C1A18'])
  })

  it('leaves the metas alone when the paper color cannot be read', () => {
    paperIs('')
    applyTheme('dark')
    expect(metaContents()).toEqual(['#F5F1EA', '#1C1A18'])
  })
})
