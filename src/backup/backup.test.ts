import { afterEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA_VERSION } from '../lib/storage'
import { makeCard, makeData, makeItem, rowOfAreas } from '../test/fixtures'
import type { MtfData } from '../types'
import { backupFileName, makeBackup, readBackup } from './backup'

// `readBackup` must migrate through the storage layer's `upgradeDocument`. At schema
// version 1 there is nothing older to migrate, so a test can inject a step.
const migration = vi.hoisted(() => ({
  steps: undefined as Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> | undefined,
  target: undefined as number | undefined,
}))

vi.mock('../lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/storage')>()
  return { ...actual, upgradeDocument: (doc: unknown) => actual.upgradeDocument(doc, migration.steps, migration.target) }
})

const exportedAt = new Date('2026-10-11T18:04:12.345Z')

function fullDesk(): MtfData {
  return makeData({
    areas: rowOfAreas(),
    cards: [
      makeCard({ id: 'c1', areaId: 'a1', title: 'Compras', body: 'Para el finde', items: [makeItem({ id: 'i1', text: 'Pan', done: true })] }),
      makeCard({ id: 'c2', areaId: 'a2', title: 'Viaje', pinned: true, position: { x: 1300, y: 400, tilt: -1.5, z: 4 } }),
      makeCard({ id: 'c3', areaId: 'a3', title: 'Llamar al banco', jarredAt: 1_760_000_000_000 }),
    ],
    events: [
      { id: 'e1', type: 'item', at: 10, cardId: 'c1', itemId: 'i1', title: 'Pan', areaId: 'a1' },
      { id: 'e2', type: 'card', at: 11, cardId: 'c3', title: 'Llamar al banco', areaId: 'a3' },
      { id: 'e3', type: 'note', at: 12, cardId: 'c2', title: 'Viaje', areaId: 'a2' },
    ],
  })
}

/** A Backup file's text with the envelope changed by `envelope`. */
function file(envelope: Record<string, unknown>): string {
  return JSON.stringify({ format: 'mtf-backup', exportedAt: exportedAt.toISOString(), data: fullDesk(), ...envelope })
}

describe('backupFileName', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the local date, also late at night', () => {
    vi.stubEnv('TZ', 'America/Argentina/Buenos_Aires')
    // 23:30 on October 11 in Buenos Aires is already October 12 in UTC.
    expect(backupFileName(new Date('2026-10-12T02:30:00Z'))).toBe('mtf-backup-2026-10-11.json')
  })

  it('pads the month and the day', () => {
    expect(backupFileName(new Date(2026, 0, 5, 12))).toBe('mtf-backup-2026-01-05.json')
  })
})

describe('makeBackup', () => {
  it('wraps the whole document with the marker and the export moment, and nothing else', () => {
    expect(JSON.parse(makeBackup(fullDesk(), exportedAt))).toEqual({
      format: 'mtf-backup',
      exportedAt: '2026-10-11T18:04:12.345Z',
      data: fullDesk(),
    })
  })
})

describe('readBackup', () => {
  afterEach(() => {
    migration.steps = undefined
    migration.target = undefined
    vi.restoreAllMocks()
  })

  it('reads back exactly what was exported: Desk Cards, Jar Cards, Items and every event type', () => {
    const data = fullDesk()
    expect(readBackup(makeBackup(data, exportedAt))).toEqual({ ok: true, data, exportedAt: '2026-10-11T18:04:12.345Z' })
  })

  it('keeps unknown extra fields', () => {
    const data = { ...fullDesk(), extra: 'kept' }
    expect(readBackup(makeBackup(data, exportedAt))).toMatchObject({ ok: true, data: { extra: 'kept' } })
  })

  it.each([
    ['text that is not JSON', 'hola, esto no es JSON'],
    ['a JSON list', '[1, 2, 3]'],
    ['JSON null', 'null'],
    ['foreign JSON', JSON.stringify({ name: 'package', version: '1.0.0' })],
    ['a bare data document', JSON.stringify(fullDesk())],
    ['a missing format', file({ format: undefined })],
    ['another format', file({ format: 'other-backup' })],
  ])('refuses %s as not a Backup', (_, text) => {
    expect(readBackup(text)).toEqual({ ok: false, reason: 'notBackup' })
  })

  it('refuses a file over 5 MB as not a Backup', () => {
    expect(readBackup(' '.repeat(5 * 1024 * 1024 + 1))).toEqual({ ok: false, reason: 'notBackup' })
  })

  it('refuses a Backup from a newer MTF', () => {
    expect(readBackup(file({ data: { ...fullDesk(), schemaVersion: SCHEMA_VERSION + 1 } }))).toEqual({ ok: false, reason: 'newer' })
  })

  it.each([
    ['no exportedAt', file({ exportedAt: undefined })],
    ['an exportedAt that is not a date', file({ exportedAt: 'ayer' })],
    ['no data', file({ data: undefined })],
    ['data without events', file({ data: { ...fullDesk(), events: undefined } })],
    ['a Card without an id', file({ data: { ...fullDesk(), cards: [{ ...fullDesk().cards[0], id: undefined }] } })],
    ['a Card in a missing Area', file({ data: { ...fullDesk(), cards: [{ ...fullDesk().cards[0], areaId: 'gone' }] } })],
  ])('refuses a Backup with %s as damaged', (_, text) => {
    expect(readBackup(text)).toEqual({ ok: false, reason: 'damaged' })
  })

  it('migrates an older Backup through the storage layer', () => {
    migration.steps = { 1: (doc) => ({ ...doc, upgraded: true }) }
    migration.target = 2
    expect(readBackup(makeBackup(fullDesk(), exportedAt))).toEqual({
      ok: true,
      data: { ...fullDesk(), schemaVersion: 2, upgraded: true },
      exportedAt: '2026-10-11T18:04:12.345Z',
    })
  })

  it('refuses an older Backup whose migration fails as damaged', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    migration.steps = {}
    migration.target = 2
    expect(readBackup(makeBackup(fullDesk(), exportedAt))).toEqual({ ok: false, reason: 'damaged' })
  })
})
