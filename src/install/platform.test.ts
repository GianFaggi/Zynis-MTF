import { afterEach, describe, expect, it, vi } from 'vitest'
import { USER_AGENTS, restoreDevice, stubDevice } from '../test/device'
import { isIos, isStandalone } from './platform'

describe('platform', () => {
  afterEach(() => {
    restoreDevice()
    vi.restoreAllMocks()
  })

  it.each([
    ['an iPhone', { userAgent: USER_AGENTS.iphone, touchPoints: 5 }, true],
    ['an older iPad', { userAgent: USER_AGENTS.ipad, touchPoints: 5 }, true],
    ['an iPad that reports itself as a Mac', { userAgent: USER_AGENTS.mac, touchPoints: 5 }, true],
    ['a real Mac', { userAgent: USER_AGENTS.mac, touchPoints: 0 }, false],
    ['an Android phone', { userAgent: USER_AGENTS.android, touchPoints: 5 }, false],
    ['a Windows PC', { userAgent: USER_AGENTS.windows }, false],
  ])('isIos on %s is %s', (_, device, expected) => {
    stubDevice(device)
    expect(isIos()).toBe(expected)
  })

  it('isStandalone when the display mode is standalone', () => {
    stubDevice({ displayStandalone: true })
    expect(isStandalone()).toBe(true)
  })

  it("isStandalone from iOS's own flag", () => {
    stubDevice({ userAgent: USER_AGENTS.iphone, iosStandalone: true })
    expect(isStandalone()).toBe(true)
  })

  it('not standalone in a browser tab', () => {
    stubDevice({ userAgent: USER_AGENTS.iphone, iosStandalone: false })
    expect(isStandalone()).toBe(false)
  })

  it('not standalone where matchMedia is missing', () => {
    expect(isStandalone()).toBe(false)
  })
})
