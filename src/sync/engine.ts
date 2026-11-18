import { useAccountStore } from '../account/accountStore'
import type { ApiResult } from '../account/api'
import { useDeskStore } from '../desk/deskStore'
import { showWholeDesk } from '../desk/view'
import { translate } from '../i18n'
import { newId } from '../lib/id'
import { SCHEMA_VERSION, clearReplaced, emptySync, loadReplaced, loadSync, saveReplaced, saveSync } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import type { MtfData, RecordKey, SyncRecord, SyncState } from '../types'
import { deskSummary, firstSignIn } from './firstSignIn'
import { mergeRecords, repairDesk } from './merge'
import { normalizeWins } from './normalize'
import { addPending, confirmSent, diffData, outgoing, type Pending } from './outbox'
import { canonicalOrder, entitiesOf, fromRecords, keyOf } from './records'
import { leaveSend, pullRecords, pushRecords, type PushOutcome } from './syncApi'
import { useSyncStore } from './syncStore'

// The only sync module with side effects (#37, design D4, D6, D8, D11, D12, D13): it records what
// changes in `appStore`, runs arrivals and leave sends one at a time, retries with a growing wait,
// holds fetched changes during a drag or an edit, and runs the first sign-in rule. The decisions
// themselves are the pure functions it calls. Nothing here sends a request without a session.

/** Waits before each retry after a failure; then sync stops until the next trigger. Never a loop. */
export const RETRY_DELAYS = [10_000, 30_000, 90_000]
/** How long "Recuperar el escritorio anterior" is offered after a replacement. */
export const REPLACED_FOR = 30 * 24 * 60 * 60 * 1000

const SYNC_LOCK = 'mtf_sync'
const RETRYABLE = new Set(['timeout', 'network', 'server_error', 'too_many_requests'])

type Trigger = 'arrive' | 'leave' | 'close' | 'push'
type Failure = Extract<ApiResult<unknown>, { ok: false }>
type Pulled = { records: SyncRecord[]; next: number }

let state: SyncState = emptySync()
let started = false
let unsubscribe: (() => void)[] = []
/** Set while sync applies a fetched change, so the outbox does not count it as a local one. */
let applyingRemote = false
let running = false
let queued: Trigger | null = null
let attempt = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
/** Fetched while a Card or an Area was lifted: merged on the drop. */
let deferred: Pulled | null = null
/** The Account's Desk while the first sign-in dialog waits for the user. */
let choiceRemote: Pulled | null = null

const email = () => useAccountStore.getState().email
const appData = () => useAppStore.getState().data

/**
 * Loads `mtf_sync` and starts listening: to `appStore` (the outbox), to `deskStore` (drops and the
 * editor closing) and to the account (a sign-in syncs at once). Makes no request. Idempotent.
 */
export function initSync(): void {
  if (started) return
  started = true
  state = loadSync()
  publish()
  forgetOldCopy()

  unsubscribe = [
    useAppStore.subscribe((current, previous) => {
      if (current.data === previous.data || applyingRemote || state.owner === null) return
      const changes = diffData(previous.data, current.data, Date.now())
      if (Object.keys(changes).length === 0) return
      state = { ...state, pending: addPending(state.pending, changes) }
      save()
    }),
    useDeskStore.subscribe((current, previous) => {
      if (previous.lifted && !current.lifted && deferred) applyDeferred()
      if (current.editingId !== previous.editingId && state.held.length > 0) mergeHeld()
    }),
    useAccountStore.subscribe((current, previous) => {
      if (current.email === previous.email) return
      if (current.email === null) return stopSync()
      void syncNow()
    }),
  ]

  // A change held for a Card whose editor was open when MTF closed.
  if (state.held.length > 0 && useDeskStore.getState().editingId === null) mergeHeld()
}

/** Tests only: forget everything, as a fresh launch would. */
export function resetSyncEngine(): void {
  for (const stop of unsubscribe) stop()
  unsubscribe = []
  started = false
  applyingRemote = false
  running = false
  queued = null
  attempt = 0
  clearTimeout(retryTimer)
  deferred = null
  choiceRemote = null
  state = emptySync()
  useSyncStore.setState({ syncing: false, lastSyncAt: null, pendingCount: 0, choice: null, replacedUntil: null })
}

/** Arriving: fetch and merge what changed in the Account, then send what is pending here. */
export function syncNow(): Promise<void> {
  return run('arrive')
}

/** Leaving: send what is pending. `closing` (pagehide) leaves no time to renew the access token. */
export function leave({ closing = false }: { closing?: boolean } = {}): Promise<void> {
  if (!hasPending()) return Promise.resolve()
  return run(closing ? 'close' : 'leave')
}

/** The connection came back: send what is pending. */
export function pushPending(): Promise<void> {
  if (!hasPending()) return Promise.resolve()
  return run('push')
}

export function hasPending(): boolean {
  return Object.keys(state.pending).length > 0
}

/** This Desk becomes the Account's on the next sync: after an Import while signed in, or a recovery. */
export function claimDesk(): void {
  if (!email()) return
  state = { ...state, claim: Date.now() }
  save()
  void syncNow()
}

/** "Usar el de la cuenta": keeps a copy of this Desk (unless an Export stands in for it), then takes the Account's. */
export function chooseAccount(): void {
  const { choice } = useSyncStore.getState()
  const me = email()
  if (!choice || !choiceRemote || !me) return
  if (!choice.exported) {
    const now = Date.now()
    if (!saveReplaced(appData(), now)) {
      useSyncStore.setState({ choice: { ...choice, noRoom: true } })
      return
    }
    useSyncStore.setState({ replacedUntil: now + REPLACED_FOR })
  }
  const remote = choiceRemote
  closeChoice()
  take(me, remote)
  void run('push')
}

/** "Subir este": this Desk becomes the Account's. */
export function chooseUpload(): void {
  const me = email()
  if (!useSyncStore.getState().choice || !choiceRemote || !me) return
  const remote = choiceRemote
  closeChoice()
  state = { ...state, claim: Date.now() }
  claimWith(me, remote)
  void run('push')
}

/** The Export asked for by `noRoom` was made: Usar el de la cuenta may go ahead without the copy. */
export function markExported(): void {
  const { choice } = useSyncStore.getState()
  if (choice) useSyncStore.setState({ choice: { ...choice, exported: true } })
}

/** Closing the dialog without choosing changes nothing; the next arrival asks again. */
export function closeChoice(): void {
  choiceRemote = null
  useSyncStore.setState({ choice: null })
}

/** "Recuperar el escritorio anterior": the kept copy comes back and becomes the Account's Desk. */
export function recoverPrevious(): void {
  const copy = loadReplaced()
  if (!copy) return
  useAppStore.getState().replaceData(copy.data)
  useDeskStore.getState().resetAfterImport()
  clearReplaced()
  useSyncStore.setState({ replacedUntil: null })
  claimDesk()
}

function stopSync(): void {
  clearTimeout(retryTimer)
  attempt = 0
  queued = null
  closeChoice()
}

// ---------------------------------------------------------------------------------------------
// Running one sync at a time

async function run(trigger: Trigger, { retry = false }: { retry?: boolean } = {}): Promise<void> {
  if (!email()) return
  if (!retry) {
    clearTimeout(retryTimer)
    attempt = 0
  }
  if (running) {
    // One trigger is remembered; an arrival covers a send.
    queued = queued === 'arrive' || trigger === 'arrive' ? 'arrive' : trigger
    return
  }
  running = true
  try {
    await oneAtATime(() => perform(trigger))
  } finally {
    running = false
    const next = queued
    queued = null
    if (next) void run(next)
  }
}

/** Under the Web Lock `mtf_sync`, so two tabs never sync at once; a browser without locks runs it at once. */
function oneAtATime(task: () => Promise<void>): Promise<void> {
  return 'locks' in navigator && navigator.locks ? navigator.locks.request(SYNC_LOCK, task) : task()
}

async function perform(trigger: Trigger): Promise<void> {
  const me = email()
  if (!me) return
  useSyncStore.setState({ syncing: true })
  try {
    const failure = trigger === 'arrive' ? await arrive(me) : await send(me, trigger)
    if (failure) retryLater(failure, trigger)
  } finally {
    useSyncStore.setState({ syncing: false })
  }
}

function retryLater(failure: Failure, trigger: Trigger): void {
  // offline: the `online` trigger takes over; session_ended: the session is over, pending stays.
  if (!RETRYABLE.has(failure.code) && (failure.status ?? 0) < 500) return
  if (attempt >= RETRY_DELAYS.length) {
    attempt = 0
    return
  }
  const delay = Math.max(RETRY_DELAYS[attempt], (failure.retryAfter ?? 0) * 1000)
  attempt++
  retryTimer = setTimeout(() => void run(trigger === 'close' ? 'leave' : trigger, { retry: true }), delay)
}

async function arrive(me: string): Promise<Failure | undefined> {
  if (useSyncStore.getState().choice) return undefined
  if (state.claim !== null) return claim(me)
  if (state.owner !== me) return firstSignInFlow(me)

  const pulled = await pullRecords(state.cursor)
  if (!pulled.ok) return pulled.code === 'cursor_expired' ? firstSignInFlow(me) : pulled
  applyPulled(pulled.data)
  return pushOut(me)
}

async function send(me: string, trigger: Exclude<Trigger, 'arrive'>): Promise<Failure | undefined> {
  if (state.owner !== me || state.claim !== null) return undefined
  const records = outgoing(state.pending, appData())
  if (records.length === 0) return undefined
  const outcome = trigger === 'push' ? await pushRecords(records) : await leaveSend(records, { renew: trigger === 'leave' })
  return confirm(outcome)
}

async function pushOut(me: string): Promise<Failure | undefined> {
  if (state.owner !== me) return undefined
  const records = outgoing(state.pending, appData())
  if (records.length > 0) return confirm(await pushRecords(records))
  finished()
  return undefined
}

/** Removes what the server confirmed, reading `pending` as it is now (it may have grown meanwhile). */
function confirm(outcome: PushOutcome): Failure | undefined {
  if (outcome.sent.length > 0) {
    state = { ...state, pending: confirmSent(state.pending, outcome.sent) }
    save()
  }
  if (!outcome.failure) finished()
  return outcome.failure
}

function finished(): void {
  state = { ...state, lastSyncAt: Date.now() }
  save()
}

// ---------------------------------------------------------------------------------------------
// Merging

function applyPulled(pulled: Pulled): void {
  if (useDeskStore.getState().lifted) {
    // Keep it for the drop. A later pull starts from the same cursor, so it includes this one.
    deferred = pulled
    return
  }
  mergeIn(pulled.records)
  state = { ...state, cursor: pulled.next }
  save()
}

function applyDeferred(): void {
  const pulled = deferred!
  deferred = null
  applyPulled(pulled)
  void pushPending()
}

function mergeHeld(): void {
  const held = state.held
  state = { ...state, held: [] }
  mergeIn(held)
  save()
}

/** Merges records into the Desk (holding those of the open Card), then repairs and normalizes as a local change. */
function mergeIn(records: readonly SyncRecord[]): void {
  const { editingId } = useDeskStore.getState()
  const result = mergeRecords(appData(), records, state.pending, { editingId })
  if (result.held.length > 0) state = { ...state, held: newestOnly([...state.held, ...result.held]) }
  if (result.changed) applyRemote(result.data)
  tidyAfterMerge()
  closeWhatIsGone()
  if (result.changed) {
    const { language } = useAppStore.getState()
    useDeskStore.getState().showToast(translate(language, 'syncUpToDate'))
  }
}

/** Repairs (orphan Cards, no Area left) and brings Wins in line: a local change, so it is recorded and sent. */
function tidyAfterMerge(): void {
  const data = appData()
  const now = Date.now()
  const next = normalizeWins(repairDesk(data, now), now, newId)
  if (next !== data) useAppStore.getState().replaceData(next)
}

/** An editor or a filter pointing at an Area that a merge removed closes. */
function closeWhatIsGone(): void {
  const desk = useDeskStore.getState()
  const areaIds = new Set(appData().areas.map((area) => area.id))
  if (desk.areaEditor && !areaIds.has(desk.areaEditor.id)) desk.closeAreaEditor()
  if (desk.winsAreaId !== null && !areaIds.has(desk.winsAreaId)) desk.setWinsArea(null)
}

function applyRemote(data: MtfData): void {
  applyingRemote = true
  try {
    useAppStore.getState().replaceData(data)
  } finally {
    applyingRemote = false
  }
}

function newestOnly(records: readonly SyncRecord[]): SyncRecord[] {
  const newest = new Map<RecordKey, SyncRecord>()
  for (const record of records) {
    const key = keyOf(record.kind, record.id)
    const seen = newest.get(key)
    if (!seen || seen.updatedAt <= record.updatedAt) newest.set(key, record)
  }
  return [...newest.values()]
}

// ---------------------------------------------------------------------------------------------
// First sign-in and claim

async function firstSignInFlow(me: string): Promise<Failure | undefined> {
  const pulled = await pullRecords(0)
  if (!pulled.ok) return pulled
  const decision = firstSignIn(appData(), pulled.data.records)
  if (decision === 'upload') {
    state = { ...state, claim: Date.now() }
    claimWith(me, pulled.data)
    return pushOut(me)
  }
  if (decision === 'take') {
    take(me, pulled.data)
    return pushOut(me)
  }
  // Nothing syncs until the user chooses.
  choiceRemote = pulled.data
  const remote = fromRecords(pulled.data.records, SCHEMA_VERSION)
  useSyncStore.setState({ choice: { local: deskSummary(appData()), remote: deskSummary(remote), noRoom: false, exported: false } })
  return undefined
}

async function claim(me: string): Promise<Failure | undefined> {
  const pulled = await pullRecords(0)
  if (!pulled.ok) return pulled
  claimWith(me, pulled.data)
  return pushOut(me)
}

/**
 * This Desk becomes the Account's (Subir este, an Import while signed in, Recuperar): every local
 * entity is pending, and every Account record not on this device gets a tombstone. Each entry is at
 * the claim, or just after the Account's own copy, so it wins on the server whatever its clock said.
 */
function claimWith(me: string, remote: Pulled): void {
  const at = state.claim ?? Date.now()
  const remoteAt = new Map(remote.records.map((record) => [keyOf(record.kind, record.id), record]))
  const local = entitiesOf(appData())
  const changes: Pending = {}
  for (const key of local.keys()) changes[key] = { at: Math.max(at, (remoteAt.get(key)?.updatedAt ?? 0) + 1) }
  for (const [key, record] of remoteAt) {
    if (!record.deleted && !local.has(key)) changes[key] = { at: Math.max(at, record.updatedAt + 1), deleted: true }
  }
  state = { ...state, owner: me, cursor: remote.next, claim: null, held: [], pending: addPending(state.pending, changes) }
  save()
}

/** This device takes the Account's Desk as a whole (a new device, or Usar el de la cuenta). */
function take(me: string, remote: Pulled): void {
  state = { ...state, owner: me, cursor: remote.next, claim: null, held: [], pending: {} }
  save()
  applyRemote(canonicalOrder(fromRecords(remote.records, SCHEMA_VERSION)))
  useDeskStore.getState().resetAfterImport()
  tidyAfterMerge()
  showWholeDesk()
}

// ---------------------------------------------------------------------------------------------
// State

function save(): void {
  saveSync(state)
  publish()
}

function publish(): void {
  useSyncStore.setState({ lastSyncAt: state.lastSyncAt, pendingCount: Object.keys(state.pending).length })
}

/** At launch, with no request: a replaced Desk older than 30 days goes; a younger one is offered back. */
function forgetOldCopy(): void {
  const copy = loadReplaced()
  if (!copy) return
  const until = copy.at + REPLACED_FOR
  if (until <= Date.now()) {
    clearReplaced()
    useSyncStore.setState({ replacedUntil: null })
  } else {
    useSyncStore.setState({ replacedUntil: until })
  }
}
