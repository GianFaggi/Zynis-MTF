import { upgradeDocument } from '../lib/storage'
import type { MtfData } from '../types'
import { isValidData } from './validate'

// The Backup file (ADR 0006, KB/frontend/storage.md#export--import): an envelope with
// a marker, the export moment and the whole data document. Pure functions only; how
// the file leaves the device is `deliver.ts`, and the UI is `BackupSection.tsx`.

const FORMAT = 'mtf-backup'
/** More than localStorage can hold anyway (about 5 MB). */
const MAX_LENGTH = 5 * 1024 * 1024

export type BackupResult =
  | { ok: true; data: MtfData; exportedAt: string }
  | { ok: false; reason: 'notBackup' | 'newer' | 'damaged' }

/** `mtf-backup-YYYY-MM-DD.json` from the local date (`toISOString()` would be tomorrow after 21:00 in Argentina). */
export function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `mtf-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

/** The Backup file's text, pretty-printed so it can be read or fixed by hand. */
export function makeBackup(data: MtfData, now: Date): string {
  return JSON.stringify({ format: FORMAT, exportedAt: now.toISOString(), data }, null, 2)
}

/** Reads a picked file's text. Changes nothing: the caller replaces the data after the user confirms. */
export function readBackup(text: string): BackupResult {
  if (text.length > MAX_LENGTH) return { ok: false, reason: 'notBackup' }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'notBackup' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false, reason: 'notBackup' }
  const envelope = parsed as Record<string, unknown>
  if (envelope.format !== FORMAT) return { ok: false, reason: 'notBackup' }

  // The summary shows the export date, so it must be a readable one.
  const { exportedAt } = envelope
  if (typeof exportedAt !== 'string' || Number.isNaN(Date.parse(exportedAt))) return { ok: false, reason: 'damaged' }

  const upgraded = upgradeDocument(envelope.data)
  if (!upgraded.ok) return { ok: false, reason: upgraded.reason === 'newer' ? 'newer' : 'damaged' }
  if (!isValidData(upgraded.data)) return { ok: false, reason: 'damaged' }
  return { ok: true, data: upgraded.data, exportedAt }
}
