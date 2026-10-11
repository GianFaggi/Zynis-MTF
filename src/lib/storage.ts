import type { Language, MtfData } from '../types'

// The only module that touches localStorage (KB/frontend/storage.md, ADR 0004).
// Every access is wrapped: if the browser refuses storage (blocked, private mode,
// quota), MTF logs a warning and keeps working with its in-memory state.

export const SCHEMA_VERSION = 1

export const DATA_KEY = 'mtf_data'
export const LANGUAGE_KEY = 'mtf_language'
export const HINT_SEEN_KEY = 'mtf_hint_seen'
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

export function loadData(): MtfData {
  const raw = read(DATA_KEY)
  if (raw === null) return emptyData()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return recover(raw, 'stored data is not valid JSON')
  }

  if (!isDocument(parsed)) return recover(raw, 'stored data has the wrong shape')
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return recover(raw, `stored data has schema version ${parsed.schemaVersion}, newer than ${SCHEMA_VERSION}`)
  }

  try {
    const migrated = migrate(parsed, migrations, SCHEMA_VERSION)
    if (!isDocument(migrated)) return recover(raw, 'migrated data has the wrong shape')
    // The document and its lists are checked; the entities inside were written by MTF itself.
    return migrated as unknown as MtfData
  } catch (error) {
    return recover(raw, `migration failed: ${String(error)}`)
  }
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

/** Whether the first-run hint was dismissed on this device. A device setting, like the language. */
export function loadHintSeen(): boolean {
  return read(HINT_SEEN_KEY) === '1'
}

export function saveHintSeen(): void {
  write(HINT_SEEN_KEY, '1')
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
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const doc = value as Record<string, unknown>
  return (
    typeof doc.schemaVersion === 'number' &&
    Number.isInteger(doc.schemaVersion) &&
    doc.schemaVersion >= 1 &&
    Array.isArray(doc.areas) &&
    Array.isArray(doc.cards) &&
    Array.isArray(doc.events)
  )
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
