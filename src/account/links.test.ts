import { beforeEach, describe, expect, it } from 'vitest'
import { initialAccountState, useAccountStore } from './accountStore'
import { listenForAccountLinks, readAccountLink } from './links'

const token = 'q3V0aGVyX3Rva2VuLTI1Ni1iaXRz_abc-123'

function openAt(address: string) {
  history.replaceState(null, '', address)
}

describe('readAccountLink', () => {
  beforeEach(() => {
    useAccountStore.setState(initialAccountState(), true)
    openAt('/')
  })

  it.each([
    ['verify', `#verify=${token}`],
    ['reset', `#reset=${token}`],
  ] as const)('a %s link opens the Account sheet on its step and leaves the address at once', (kind, hash) => {
    openAt(`/${hash}`)

    expect(readAccountLink()).toEqual({ kind, token })

    expect(useAccountStore.getState()).toMatchObject({ sheetOpen: true, link: { kind, token } })
    expect(location.hash).toBe('')
    expect(location.href).not.toContain(token)
  })

  it('keeps the path and the query when it clears the fragment', () => {
    openAt(`/?avion#reset=${token}`)

    readAccountLink()

    expect(location.pathname + location.search).toBe('/?avion')
    expect(location.hash).toBe('')
  })

  it('does nothing on a normal launch', () => {
    expect(readAccountLink()).toBeNull()
    expect(useAccountStore.getState()).toMatchObject({ sheetOpen: false, link: null })
  })

  it.each([
    ['an unknown fragment', '#settings'],
    ['an empty token', '#verify='],
    ['an unknown kind', `#login=${token}`],
    ['a token with other characters', '#reset=abc.def'],
  ])('does nothing with %s, and leaves it in the address', (_, hash) => {
    openAt(`/${hash}`)

    expect(readAccountLink()).toBeNull()

    expect(useAccountStore.getState()).toMatchObject({ sheetOpen: false, link: null })
    expect(location.hash).toBe(hash)
  })
})

describe('listenForAccountLinks', () => {
  beforeEach(() => {
    useAccountStore.setState(initialAccountState(), true)
    openAt('/')
  })

  it('also reads a link that arrives while MTF is already open', () => {
    const stop = listenForAccountLinks()
    expect(useAccountStore.getState().sheetOpen).toBe(false)

    openAt(`/#verify=${token}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    expect(useAccountStore.getState()).toMatchObject({ sheetOpen: true, link: { kind: 'verify', token } })
    expect(location.hash).toBe('')
    stop()
  })
})
