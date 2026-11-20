import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountStore } from '../account/accountStore'
import { useDeskStore } from '../desk/deskStore'
import { defaultAreas } from '../desk/areas'
import { emptySync, loadReplaced, loadSync, saveReplaced, saveSync } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { makeCard, makeItem } from '../test/fixtures'
import { resetStores } from '../test/stores'
import type { Card, SyncRecord, SyncState } from '../types'
import {
  RETRY_DELAYS,
  chooseAccount,
  chooseUpload,
  claimDesk,
  closeChoice,
  initSync,
  leave,
  markExported,
  recoverPrevious,
  resetSyncEngine,
  syncNow,
} from './engine'
import { leaveSend, pullRecords, pushRecords } from './syncApi'
import { useSyncStore } from './syncStore'

vi.mock('./syncApi', () => ({ pullRecords: vi.fn(), pushRecords: vi.fn(), leaveSend: vi.fn() }))

const pull = vi.mocked(pullRecords)
const push = vi.mocked(pushRecords)
const leaving = vi.mocked(leaveSend)

const ME = 'ana@example.com'

function cardRecord(card: Card, updatedAt = card.updatedAt): SyncRecord {
  return { kind: 'card', id: card.id, updatedAt, deleted: false, data: card }
}

/** The Account answers these records, and accepts every push. */
function accountHas(records: SyncRecord[] = [], next = 10) {
  pull.mockResolvedValue({ ok: true, data: { records, next } })
}

function acceptPushes() {
  push.mockImplementation(async (records) => ({ sent: [...records] }))
  leaving.mockImplementation(async (records) => ({ sent: [...records] }))
}

/** This device already synced with the Account, at cursor 10. */
function syncedBefore(overrides: Partial<SyncState> = {}) {
  saveSync({ ...emptySync(), owner: ME, cursor: 10, ...overrides })
}

function signedIn() {
  useAccountStore.setState({ email: ME, accessToken: 'jwt', accessTokenExpiresAt: Date.now() + 900_000 })
}

const pushedIds = (call = -1) => push.mock.calls.at(call)?.[0].map((record) => `${record.kind}:${record.id}${record.deleted ? ' (deleted)' : ''}`)

describe('sync engine', () => {
  beforeEach(() => {
    resetSyncEngine()
    resetStores()
    pull.mockReset()
    push.mockReset()
    leaving.mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    resetSyncEngine()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('recording', () => {
    it('records a local change as pending, kept in mtf_sync', () => {
      syncedBefore()
      signedIn()
      initSync()

      const id = useAppStore.getState().createCard({ x: 200, y: 300 })!

      expect(loadSync().pending).toHaveProperty(`card:${id}`)
      expect(useSyncStore.getState().pendingCount).toBe(1)
    })

    it('records nothing on a device with no owner, and sends nothing with no session', async () => {
      initSync()
      useAppStore.getState().createCard({ x: 200, y: 300 })
      expect(loadSync().pending).toEqual({})

      await syncNow()
      expect(pull).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
    })

    it('does not count a change sync applied itself', async () => {
      syncedBefore()
      signedIn()
      initSync()
      accountHas([cardRecord(makeCard({ id: 'remote', title: 'Del teléfono', updatedAt: 5 }))])
      acceptPushes()

      await syncNow()

      expect(useAppStore.getState().data.cards.map((card) => card.id)).toContain('remote')
      expect(loadSync().pending).toEqual({})
    })
  })

  describe('arriving', () => {
    it('pulls from the cursor, merges, then pushes what is pending and moves the cursor', async () => {
      syncedBefore()
      signedIn()
      initSync()
      const id = useAppStore.getState().createCard({ x: 200, y: 300 })!
      accountHas([cardRecord(makeCard({ id: 'remote' }))], 12)
      acceptPushes()

      await syncNow()

      expect(pull).toHaveBeenCalledWith(10)
      expect(pushedIds()).toEqual([`card:${id}`])
      expect(loadSync()).toMatchObject({ cursor: 12, pending: {} })
      expect(loadSync().lastSyncAt).not.toBeNull()
    })

    it('shows the toast only when changes arrived', async () => {
      syncedBefore()
      signedIn()
      initSync()
      accountHas([])
      acceptPushes()
      await syncNow()
      expect(useDeskStore.getState().toast).toBeNull()

      accountHas([cardRecord(makeCard({ id: 'remote' }))])
      await syncNow()
      expect(useDeskStore.getState().toast?.title).toBe('Tu escritorio está al día')
    })

    it('resends an unconfirmed push on the next arrival', async () => {
      syncedBefore()
      signedIn()
      initSync()
      const id = useAppStore.getState().createCard({ x: 200, y: 300 })!
      accountHas([])
      push.mockResolvedValueOnce({ sent: [], failure: { ok: false, code: 'aborted' } })

      await syncNow()
      expect(loadSync().pending).toHaveProperty(`card:${id}`)

      acceptPushes()
      await syncNow()
      expect(pushedIds()).toEqual([`card:${id}`])
      expect(loadSync().pending).toEqual({})
    })

    it('retries after 10, 30 and 90 s, then stays quiet until the next trigger', async () => {
      vi.useFakeTimers()
      syncedBefore()
      signedIn()
      initSync()
      pull.mockResolvedValue({ ok: false, code: 'server_error', status: 503 })

      await syncNow()
      for (const delay of RETRY_DELAYS) await vi.advanceTimersByTimeAsync(delay)
      expect(pull).toHaveBeenCalledTimes(4)

      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(pull).toHaveBeenCalledTimes(4)

      await syncNow()
      expect(pull).toHaveBeenCalledTimes(5)
    })

    it('waits as long as Retry-After says when that is longer', async () => {
      vi.useFakeTimers()
      syncedBefore()
      signedIn()
      initSync()
      pull.mockResolvedValue({ ok: false, code: 'too_many_requests', status: 429, retryAfter: 45 })

      await syncNow()
      await vi.advanceTimersByTimeAsync(44_000)
      expect(pull).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(pull).toHaveBeenCalledTimes(2)
    })

    it('does not retry offline; the online trigger takes over', async () => {
      vi.useFakeTimers()
      syncedBefore()
      signedIn()
      initSync()
      pull.mockResolvedValue({ ok: false, code: 'offline' })

      await syncNow()
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
      expect(pull).toHaveBeenCalledTimes(1)
    })

    it('keeps pending changes when the session ends, and stops', async () => {
      vi.useFakeTimers()
      syncedBefore()
      signedIn()
      initSync()
      const id = useAppStore.getState().createCard({ x: 200, y: 300 })!
      accountHas([])
      push.mockResolvedValue({ sent: [], failure: { ok: false, code: 'session_ended', status: 401 } })

      await syncNow()
      useAccountStore.setState({ email: null, accessToken: null })
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000)

      expect(push).toHaveBeenCalledTimes(1)
      expect(loadSync()).toMatchObject({ owner: ME })
      expect(loadSync().pending).toHaveProperty(`card:${id}`)
    })

    it('runs one sync at a time and remembers one trigger', async () => {
      syncedBefore()
      signedIn()
      initSync()
      let answer!: () => void
      pull.mockImplementationOnce(
        () => new Promise((resolve) => (answer = () => resolve({ ok: true, data: { records: [], next: 10 } }))),
      )
      accountHas([])
      acceptPushes()

      const first = syncNow()
      void syncNow()
      void syncNow()
      expect(pull).toHaveBeenCalledTimes(1)
      answer()
      await first
      await vi.waitFor(() => expect(pull).toHaveBeenCalledTimes(2))
    })
  })

  describe('leaving', () => {
    it('sends what is pending with the leave send, renewing on hide but not on close', async () => {
      syncedBefore()
      signedIn()
      initSync()
      acceptPushes()
      useAppStore.getState().createCard({ x: 200, y: 300 })

      await leave()
      expect(leaving).toHaveBeenLastCalledWith(expect.any(Array), { renew: true })
      expect(loadSync().pending).toEqual({})

      useAppStore.getState().createCard({ x: 400, y: 300 })
      await leave({ closing: true })
      expect(leaving).toHaveBeenLastCalledWith(expect.any(Array), { renew: false })
    })

    it('records handwriting as a change of its Card and sends it whole (#47)', async () => {
      resetStores({ cards: [makeCard({ id: 'h', title: 'Viaje' })] })
      syncedBefore()
      signedIn()
      initSync()
      acceptPushes()
      const ink = { height: 400, strokes: [[10, 10, 50, 200, 40, 60]] }
      useAppStore.getState().setInk('h', ink)
      expect(Object.keys(loadSync().pending)).toEqual(['card:h'])

      await leave()
      const [sent] = leaving.mock.calls.at(-1)![0]
      expect(sent).toMatchObject({ kind: 'card', id: 'h', deleted: false, data: { ink } })
    })

    it('sends nothing when nothing is pending', async () => {
      syncedBefore()
      signedIn()
      initSync()
      await leave()
      expect(leaving).not.toHaveBeenCalled()
    })
  })

  describe('first sign-in', () => {
    it('uploads this Desk to an empty Account', async () => {
      signedIn()
      initSync()
      useAppStore.getState().createCard({ x: 200, y: 300 })
      accountHas([], 0)
      acceptPushes()

      await syncNow()

      expect(pull).toHaveBeenCalledWith(0)
      expect(push.mock.calls[0][0]).toHaveLength(4) // three Areas and the Card
      expect(loadSync()).toMatchObject({ owner: ME, claim: null, pending: {} })
    })

    it('takes the Account Desk on a new device without asking', async () => {
      useAppStore.setState({ data: { ...useAppStore.getState().data, areas: defaultAreas(1) } })
      signedIn()
      initSync()
      const remote = makeCard({ id: 'remote', title: 'Del teléfono', areaId: 'ra' })
      accountHas([{ kind: 'area', id: 'ra', updatedAt: 1, deleted: false, data: { ...defaultAreas(1)[0], id: 'ra' } }, cardRecord(remote)], 7)
      acceptPushes()

      await syncNow()

      expect(useSyncStore.getState().choice).toBeNull()
      expect(useAppStore.getState().data.cards.map((card) => card.id)).toEqual(['remote'])
      expect(useAppStore.getState().data.areas.map((area) => area.id)).toEqual(['ra'])
      expect(loadSync()).toMatchObject({ owner: ME, cursor: 7 })
      expect(loadReplaced()).toBeNull()
    })

    it('asks when both sides have notes, and changes nothing until the user chooses', async () => {
      signedIn()
      initSync()
      useAppStore.getState().createCard({ x: 200, y: 300 })
      const before = useAppStore.getState().data
      accountHas([cardRecord(makeCard({ id: 'remote', updatedAt: 99 }))])

      await syncNow()

      expect(useSyncStore.getState().choice).toMatchObject({
        local: { desk: 1, jar: 0, areas: 3 },
        remote: { desk: 1, jar: 0, areas: 0, updatedAt: 99 },
        noRoom: false,
      })
      expect(useAppStore.getState().data).toBe(before)
      expect(push).not.toHaveBeenCalled()
      expect(loadSync().owner).toBeNull()

      closeChoice()
      expect(useAppStore.getState().data).toBe(before)
      await syncNow()
      expect(useSyncStore.getState().choice).not.toBeNull()
    })

    it('Usar el de la cuenta keeps a copy, then takes the Account Desk', async () => {
      signedIn()
      initSync()
      const mine = useAppStore.getState().createCard({ x: 200, y: 300 })!
      accountHas([cardRecord(makeCard({ id: 'remote', areaId: 'a1' }))])
      acceptPushes()
      await syncNow()

      chooseAccount()

      expect(loadReplaced()?.data.cards.map((card) => card.id)).toEqual([mine])
      expect(useSyncStore.getState().replacedUntil).toBeGreaterThan(Date.now())
      expect(useAppStore.getState().data.cards.map((card) => card.id)).toEqual(['remote'])
      expect(useSyncStore.getState().choice).toBeNull()
      expect(loadSync().owner).toBe(ME)
    })

    it('with no room for the copy, Usar el de la cuenta waits for an Export', async () => {
      signedIn()
      initSync()
      useAppStore.getState().createCard({ x: 200, y: 300 })
      accountHas([cardRecord(makeCard({ id: 'remote' }))])
      acceptPushes()
      await syncNow()
      const setItem = Storage.prototype.setItem
      const refuse = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
        if (key.startsWith('mtf_data_replaced_')) throw new DOMException('full', 'QuotaExceededError')
        setItem.call(this, key, value)
      })

      chooseAccount()
      expect(useSyncStore.getState().choice?.noRoom).toBe(true)
      expect(useAppStore.getState().data.cards.map((card) => card.id)).not.toContain('remote')

      markExported()
      chooseAccount()
      refuse.mockRestore()
      expect(useAppStore.getState().data.cards.map((card) => card.id)).toEqual(['remote'])
    })

    it('Subir este makes this Desk the Account one, deleting what is not here', async () => {
      signedIn()
      initSync()
      const mine = useAppStore.getState().createCard({ x: 200, y: 300 })!
      accountHas([cardRecord(makeCard({ id: 'remote', updatedAt: 5 }))])
      acceptPushes()
      await syncNow()

      chooseUpload()
      await vi.waitFor(() => expect(push).toHaveBeenCalled())

      expect(pushedIds()).toEqual(expect.arrayContaining([`card:${mine}`, 'card:remote (deleted)', 'area:a1']))
      expect(useAppStore.getState().data.cards.map((card) => card.id)).toEqual([mine])
    })

    it('runs the first sign-in rule after an expired cursor', async () => {
      syncedBefore()
      signedIn()
      initSync()
      useAppStore.getState().createCard({ x: 200, y: 300 })
      pull.mockResolvedValueOnce({ ok: false, code: 'cursor_expired', status: 410 })
      accountHas([cardRecord(makeCard({ id: 'remote' }))])

      await syncNow()

      expect(pull).toHaveBeenLastCalledWith(0)
      expect(useSyncStore.getState().choice).not.toBeNull()
    })

    it('a server that lost its data is refilled by this device', async () => {
      syncedBefore()
      signedIn()
      initSync()
      useAppStore.getState().createCard({ x: 200, y: 300 })
      pull.mockResolvedValueOnce({ ok: false, code: 'cursor_expired', status: 410 })
      accountHas([], 0)
      acceptPushes()

      await syncNow()

      expect(push.mock.calls[0][0]).toHaveLength(4)
    })

    it('a sign-in syncs at once', async () => {
      initSync()
      accountHas([], 0)
      acceptPushes()

      signedIn()

      await vi.waitFor(() => expect(pull).toHaveBeenCalledWith(0))
    })
  })

  describe('claim', () => {
    it('an Import with a session sets claim, and the next sync deletes Account records not on the device', async () => {
      syncedBefore()
      signedIn()
      initSync()
      accountHas([cardRecord(makeCard({ id: 'old-account-card', updatedAt: 5 }))])
      acceptPushes()
      const imported = makeCard({ id: 'imported', updatedAt: 1 })
      useAppStore.getState().replaceData({ ...useAppStore.getState().data, cards: [imported] })

      claimDesk()
      expect(loadSync().claim).not.toBeNull()
      await vi.waitFor(() => expect(push).toHaveBeenCalled())

      expect(pull).toHaveBeenCalledWith(0)
      expect(pushedIds()).toEqual(expect.arrayContaining(['card:imported', 'card:old-account-card (deleted)']))
      expect(loadSync().claim).toBeNull()
    })

    it('a claimed record wins over a newer copy on the Account', async () => {
      syncedBefore()
      signedIn()
      initSync()
      const card = makeCard({ id: 'c1', updatedAt: 1 })
      useAppStore.getState().replaceData({ ...useAppStore.getState().data, cards: [card] })
      const future = Date.now() + 60_000
      accountHas([cardRecord({ ...card, title: 'Otra' }, future)])
      acceptPushes()

      claimDesk()
      await vi.waitFor(() => expect(push).toHaveBeenCalled())

      expect(push.mock.calls[0][0].find((record) => record.id === 'c1')?.updatedAt).toBe(future + 1)
    })

    it('Recuperar el escritorio anterior brings the copy back and claims it', async () => {
      syncedBefore()
      signedIn()
      const previous = { ...useAppStore.getState().data, cards: [makeCard({ id: 'previous' })] }
      saveReplaced(previous, Date.now())
      initSync()
      expect(useSyncStore.getState().replacedUntil).toBeGreaterThan(Date.now())
      accountHas([])
      acceptPushes()

      recoverPrevious()

      expect(useAppStore.getState().data.cards.map((card) => card.id)).toEqual(['previous'])
      expect(loadReplaced()).toBeNull()
      expect(useSyncStore.getState().replacedUntil).toBeNull()
      await vi.waitFor(() => expect(pushedIds()).toContain('card:previous'))
    })

    it('a copy older than 30 days is removed at launch, with no request', () => {
      saveReplaced(useAppStore.getState().data, Date.now() - 31 * 24 * 60 * 60 * 1000)
      initSync()
      expect(loadReplaced()).toBeNull()
      expect(useSyncStore.getState().replacedUntil).toBeNull()
      expect(pull).not.toHaveBeenCalled()
    })
  })

  describe('holding remote changes', () => {
    const local = makeCard({ id: 'c1', title: 'Local', updatedAt: 1 })
    const other = makeCard({ id: 'c2', title: 'Otra', updatedAt: 1 })

    beforeEach(() => {
      resetStores({ cards: [local, other] })
    })

    it('waits while a Card is lifted and merges right after the drop', async () => {
      syncedBefore()
      signedIn()
      initSync()
      accountHas([cardRecord({ ...other, title: 'Otra, del teléfono', updatedAt: 5 })], 12)
      acceptPushes()
      useDeskStore.getState().setLifted(true)

      await syncNow()
      expect(useAppStore.getState().data.cards[1].title).toBe('Otra')
      expect(loadSync().cursor).toBe(10)

      useDeskStore.getState().setLifted(false)
      expect(useAppStore.getState().data.cards[1].title).toBe('Otra, del teléfono')
      expect(loadSync().cursor).toBe(12)
    })

    it('holds a change to the open Card until the editor closes, even across a reload', async () => {
      syncedBefore()
      signedIn()
      useDeskStore.getState().openEditor('c1')
      initSync()
      accountHas([cardRecord({ ...local, title: 'Del teléfono', updatedAt: 5 }), cardRecord({ ...other, title: 'Ya', updatedAt: 5 })], 12)
      acceptPushes()

      await syncNow()
      expect(useAppStore.getState().data.cards.map((card) => card.title)).toEqual(['Local', 'Ya'])
      expect(loadSync().held.map((record) => record.id)).toEqual(['c1'])
      expect(loadSync().cursor).toBe(12)

      // MTF closes with the editor open and opens again.
      resetSyncEngine()
      useDeskStore.getState().closeEditor()
      initSync()
      expect(useAppStore.getState().data.cards[0].title).toBe('Del teléfono')
      expect(loadSync().held).toEqual([])
    })

    it('holds fetched handwriting for the open Card, and applies it exactly when the editor closes (#47)', async () => {
      syncedBefore()
      signedIn()
      useDeskStore.getState().openEditor('c1')
      initSync()
      const ink = { height: 650, strokes: [[10, 10, 50, 200, 40, 60], [500, 500, 50]] }
      accountHas([cardRecord({ ...local, ink, updatedAt: 5 })], 12)
      acceptPushes()

      await syncNow()
      expect(useAppStore.getState().data.cards[0]).not.toHaveProperty('ink')
      expect(loadSync().held.map((record) => record.id)).toEqual(['c1'])

      useDeskStore.getState().closeEditor()
      expect(useAppStore.getState().data.cards[0].ink).toEqual(ink)
      expect(loadSync().held).toEqual([])
    })

    it('merges the held change when the editor closes', async () => {
      syncedBefore()
      signedIn()
      useDeskStore.getState().openEditor('c1')
      initSync()
      accountHas([cardRecord({ ...local, title: 'Del teléfono', updatedAt: 5 })], 12)
      acceptPushes()
      await syncNow()

      useDeskStore.getState().closeEditor()

      expect(useAppStore.getState().data.cards[0].title).toBe('Del teléfono')
    })

    it('closes an Area editor open on an Area deleted on another device', async () => {
      syncedBefore()
      signedIn()
      initSync()
      useDeskStore.getState().openAreaEditor('a3')
      accountHas([{ kind: 'area', id: 'a3', updatedAt: 5, deleted: true }])
      acceptPushes()

      await syncNow()

      expect(useAppStore.getState().data.areas.map((area) => area.id)).toEqual(['a1', 'a2'])
      expect(useDeskStore.getState().areaEditor).toBeNull()
    })

    it('brings Wins in line after a merge, as a local change that is sent', async () => {
      const finished = makeCard({ id: 'c3', items: [makeItem({ id: 'i1', text: 'Pan', done: true })], updatedAt: 1 })
      syncedBefore()
      signedIn()
      initSync()
      accountHas([cardRecord(finished, 5)])
      acceptPushes()

      await syncNow()

      const cardWins = useAppStore.getState().data.events.filter((event) => event.type === 'card' && event.cardId === 'c3')
      expect(cardWins).toHaveLength(1)
      expect(pushedIds()).toEqual([`win:${cardWins[0].id}`])
    })
  })
})
