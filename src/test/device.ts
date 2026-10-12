import { vi } from 'vitest'

// Pretends to be a given device for the install guidance tests. jsdom has no
// `matchMedia`, `maxTouchPoints` or iOS's `navigator.standalone`; `restoreDevice()`
// removes them again (spies are restored by `vi.restoreAllMocks()`).

export const USER_AGENTS = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  /** iPadOS 13+ in Safari: a Mac user agent, told apart by touch. */
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
}

type Device = {
  userAgent?: string
  touchPoints?: number
  /** `(display-mode: standalone)` matches. */
  displayStandalone?: boolean
  /** iOS's `navigator.standalone`. */
  iosStandalone?: boolean
}

export function stubDevice({ userAgent = USER_AGENTS.windows, touchPoints = 0, displayStandalone = false, iosStandalone }: Device = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touchPoints, configurable: true })
  if (iosStandalone !== undefined) Object.defineProperty(navigator, 'standalone', { value: iosStandalone, configurable: true })
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: displayStandalone && query === '(display-mode: standalone)' }))
}

export function restoreDevice() {
  Reflect.deleteProperty(navigator, 'maxTouchPoints')
  Reflect.deleteProperty(navigator, 'standalone')
  vi.unstubAllGlobals()
}
