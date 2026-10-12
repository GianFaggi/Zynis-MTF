import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deliverFile } from './deliver'

// jsdom has no matchMedia, Web Share or object URLs: each test puts its own in place.

const file = new File(['{}'], 'mtf-backup-2026-10-11.json', { type: 'application/json' })

function pointer(coarse: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query === '(pointer: coarse)' }))
}

function webShare(share: (data: ShareData) => Promise<void>, canShare = true) {
  const spy = vi.fn(share)
  Object.defineProperty(navigator, 'share', { value: spy, configurable: true })
  Object.defineProperty(navigator, 'canShare', { value: () => canShare, configurable: true })
  return spy
}

describe('deliverFile', () => {
  let click: ReturnType<typeof vi.spyOn>
  let downloaded: { href: string; download: string }[]

  beforeEach(() => {
    vi.useFakeTimers()
    downloaded = []
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded.push({ href: this.href, download: this.download })
    })
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:mtf/1'), revokeObjectURL: vi.fn() })
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share')
    Reflect.deleteProperty(navigator, 'canShare')
    Reflect.deleteProperty(URL, 'createObjectURL')
    Reflect.deleteProperty(URL, 'revokeObjectURL')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('downloads on a desktop, even when the browser can share files', async () => {
    pointer(false)
    const share = webShare(async () => {})

    expect(await deliverFile(file)).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
    expect(downloaded).toEqual([{ href: 'blob:mtf/1', download: 'mtf-backup-2026-10-11.json' }])
    expect(document.querySelector('a')).toBeNull()

    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mtf/1')
  })

  it('shares the file on a phone that can share files', async () => {
    pointer(true)
    const share = webShare(async () => {})

    expect(await deliverFile(file)).toBe('shared')
    expect(share).toHaveBeenCalledWith({ files: [file] })
    expect(click).not.toHaveBeenCalled()
  })

  it('downloads on a phone whose browser cannot share files', async () => {
    pointer(true)
    webShare(async () => {}, false)
    expect(await deliverFile(file)).toBe('downloaded')
    expect(downloaded).toHaveLength(1)
  })

  it('does nothing else when the user closes the share sheet', async () => {
    pointer(true)
    webShare(() => Promise.reject(new DOMException('Share canceled', 'AbortError')))

    expect(await deliverFile(file)).toBe('cancelled')
    expect(click).not.toHaveBeenCalled()
  })

  it('downloads when sharing fails for another reason', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    pointer(true)
    webShare(() => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')))

    expect(await deliverFile(file)).toBe('downloaded')
    expect(downloaded).toHaveLength(1)
  })
})
