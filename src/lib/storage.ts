import type { Language, MtfData, SavedArrangement, Theme } from '../types'

// The only module that touches localStorage (KB/frontend/storage.md, ADR 0004).
// Every access is wrapped: if the browser refuses storage (blocked, private mode,
// quota), MTF logs a warning and keeps working with its in-memory state.

export const SCHEMA_VERSION = 1

export const DATA_KEY = 'mtf_data'
export const LANGUAGE_KEY = 'mtf_language'
export const THEME_KEY = 'mtf_theme'
export const HINT_SEEN_KEY = 'mtf_hint_seen'
export const INSTALL_NUDGE_SEEN_KEY = 'mtf_install_nudge_seen'
export const ARRANGEMENT_KEY = 'mtf_arrangement'
export const RECOVERY_KEY_PREFIX = 'mtf_data_recovery_'

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>

/** A parsed `mtf_data` whose shape has been checked (see `isDocument`). */
type StoredDocument = Record<string, unknown> & { schemaVersion: number }

/**
 * `migrations[v]` turns a version `v` document into a version `v + 1` one.
 * Empty at v1; the first schema change adds `1: (doc) => ...` and bumps SCHEMA_VERSION.
 */
const migrations: Record<number, Migration> = {}

export function emptyData(): MtfData {
  return { schemaVersion: SCHEMA_VERSION, areas: [], cards: [], events: [] }
}

export type UpgradeResult = { ok: true; data: MtfData } | { ok: false; reason: 'shape' | 'newer' | 'migration' }

/**
 * Checks a parsed document's outer shape and migrates it to the current version: the
 * one migration path, shared by `loadData()` and Import (ADR 0006), so a stored document
 * and a Backup can never be upgraded differently. The entities inside the lists are not
 * checked here. `steps` and `target` are only passed by tests.
 */
export function upgradeDocument(doc: unknown, steps = migrations, target = SCHEMA_VERSION): UpgradeResult {
  if (!isDocument(doc)) return { ok: false, reason: 'shape' }
  if (doc.schemaVersion > target) return { ok: false, reason: 'newer' }
  try {
    const migrated = migrate(doc, steps, target)
    if (!isDocument(migrated)) return { ok: false, reason: 'migration' }
    return { ok: true, data: migrated as unknown as MtfData }
  } catch (error) {
    console.warn('[storage] migration failed:', error)
    return { ok: false, reason: 'migration' }
  }
}

const recoveryReasons: Record<Extract<UpgradeResult, { ok: false }>['reason'], string> = {
  shape: 'stored data has the wrong shape',
  newer: `stored data has a schema version newer than ${SCHEMA_VERSION}`,
  migration: 'stored data could not be migrated',
}

export function loadData(): MtfData {
  const raw = read(DATA_KEY)
  if (raw === null) return emptyData()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return recover(raw, 'stored data is not valid JSON')
  }

  const result = upgradeDocument(parsed)
  // The document and its lists are checked; the entities inside were written by MTF itself.
  return result.ok ? result.data : recover(raw, recoveryReasons[result.reason])
}

export function saveData(data: MtfData): void {
  write(DATA_KEY, JSON.stringify(data))
}

export function loadLanguage(): Language | null {
  const value = read(LANGUAGE_KEY)
  return value === 'es' || value === 'en' ? value : null
}

export function saveLanguage(language: Language): void {
  write(LANGUAGE_KEY, language)
}

export function loadTheme(): Theme | null {
  const value = read(THEME_KEY)
  return value === 'system' || value === 'light' || value === 'dark' ? value : null
}

export function saveTheme(theme: Theme): void {
  write(THEME_KEY, theme)
}

/** "Mi disposición" on this device; `null` when nothing was saved or the stored value is damaged. */
export function loadArrangement(): SavedArrangement | null {
  const raw = read(ARRANGEMENT_KEY)
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    return isArrangement(value) ? value : null
  } catch {
    return null
  }
}

export function saveArrangement(arrangement: SavedArrangement): void {
  write(ARRANGEMENT_KEY, JSON.stringify(arrangement))
}

/** Whether the first-run hint was dismissed on this device. A device setting, like the language. */
export function loadHintSeen(): boolean {
  return read(HINT_SEEN_KEY) === '1'
}

export function saveHintSeen(): void {
  write(HINT_SEEN_KEY, '1')
}

/** Whether the install nudge was shown and answered (or MTF was installed) on this device. */
export function loadInstallNudgeSeen(): boolean {
  return read(INSTALL_NUDGE_SEEN_KEY) === '1'
}

export function saveInstallNudgeSeen(): void {
  write(INSTALL_NUDGE_SEEN_KEY, '1')
}

/**
 * Asks the browser not to evict MTF's storage under pressure. Silent: does nothing
 * without the API or when already persistent, and only logs a refusal or a failure.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    const storage = navigator.storage
    if (!storage?.persist || !storage.persisted) return
    if (await storage.persisted()) return
    await storage.persist()
  } catch (error) {
    console.warn('[storage] could not ask for persistent storage:', error)
  }
}

/** Runs `steps[v]` from the document's version up to `target`, one version at a time. */
export function migrate(
  doc: StoredDocument,
  steps: Record<number, Migration>,
  target: number,
): Record<string, unknown> {
  let current: Record<string, unknown> = doc
  for (let version = doc.schemaVersion; version < target; version++) {
    const step = steps[version]
    if (!step) throw new Error(`no migration from schema version ${version}`)
    current = { ...step(current), schemaVersion: version + 1 }
  }
  return current
}

function isDocument(value: unknown): value is StoredDocument {
  return (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value.areas) &&
    Array.isArray(value.cards) &&
    Array.isArray(value.events)
  )
}

function isArrangement(value: unknown): value is SavedArrangement {
  if (!isRecord(value) || !isRecord(value.rects) || !Number.isFinite(value.savedAt)) return false
  return Object.values(value.rects).every(
    (rect) => isRecord(rect) && (['x', 'y', 'w', 'h'] as const).every((side) => Number.isFinite(rect[side])),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Keeps the unreadable text under its own key, then starts from an empty document. */
function recover(raw: string, reason: string): MtfData {
  const key = `${RECOVERY_KEY_PREFIX}${Date.now()}`
  console.warn(`[storage] ${reason}; kept a copy in "${key}" and started empty.`)
  write(key, raw)
  return emptyData()
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.warn(`[storage] could not read "${key}":`, error)
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`[storage] could not write "${key}":`, error)
  }
}
