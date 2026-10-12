import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import type { MtfData } from '../src/types/index.ts'
import { AREAS, card, deskCard, seedDesk, storedData } from './helpers.ts'

test.use({ locale: 'es-AR' })

// Desktop only: the phone project emulates touch, where Export opens the system share
// sheet, which Chromium cannot drive. The share path is unit-tested (deliver.test.ts)
// and checked by hand on real phones.
test.skip(({ isMobile }) => isMobile, 'share sheet')

const seeded: MtfData = {
  schemaVersion: 1,
  areas: AREAS,
  cards: [
    card({
      id: 'compras',
      areaId: 'a2',
      title: 'Compras',
      items: [{ id: 'i1', text: 'Pan', done: true, createdAt: 1, updatedAt: 2 }],
      position: { x: 1300, y: 300 },
    }),
    card({ id: 'viaje', areaId: 'a1', title: 'Viaje', body: 'Salimos el viernes', position: { x: 300, y: 300 } }),
    card({ id: 'banco', areaId: 'a3', title: 'Llamar al banco', jarredAt: 5 }),
  ],
  events: [
    { id: 'e1', type: 'item', at: 2, cardId: 'compras', itemId: 'i1', title: 'Pan', areaId: 'a2' },
    { id: 'e2', type: 'card', at: 2, cardId: 'compras', title: 'Compras', areaId: 'a2' },
    { id: 'e3', type: 'card', at: 5, cardId: 'banco', title: 'Llamar al banco', areaId: 'a3' },
    { id: 'e4', type: 'note', at: 1, cardId: 'viaje', title: 'Viaje', areaId: 'a1' },
  ],
}

function openSettings(page: Page) {
  return page.getByRole('button', { name: 'Ajustes' }).click()
}

/** Exports through Settings and returns the downloaded file's name and path. */
async function exportBackup(page: Page) {
  await openSettings(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar copia' }).click()
  const file = await download
  await expect(page.getByRole('status')).toContainText('Copia lista')
  await page.keyboard.press('Escape')
  return { name: file.suggestedFilename(), path: (await file.path())! }
}

async function importBackup(page: Page, path: string) {
  await openSettings(page)
  await page.locator('input[type="file"]').setInputFiles(path)
  await page.getByRole('button', { name: 'Reemplazar mis datos' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeHidden()
  await expect(page.getByRole('status')).toContainText('Copia importada')
}

/** Keeps a new Card through the editor: a change made after the export. */
async function writeNewCard(page: Page, title: string) {
  await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
  await page.keyboard.type(title)
  await page.getByRole('dialog', { name: 'Tarjeta' }).getByRole('button', { name: 'Guardar' }).click()
  await expect(page.locator('[data-card-id]', { hasText: title })).toBeVisible()
}

test('export, change the Desk, import: the data is exactly what was exported, also after a reload', async ({ page }) => {
  await seedDesk(page, seeded)

  const { name, path } = await exportBackup(page)
  const today = await page.evaluate(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  expect(name).toBe(`mtf-backup-${today}.json`)
  const backup = JSON.parse(await readFile(path, 'utf8'))
  expect(backup).toMatchObject({ format: 'mtf-backup', data: seeded })
  expect(Object.keys(backup).sort()).toEqual(['data', 'exportedAt', 'format'])

  await writeNewCard(page, 'Solo en este dispositivo')
  expect((await storedData(page)).cards).toHaveLength(4)

  await importBackup(page, path)
  expect(await storedData(page)).toEqual(seeded)
  await expect(page.locator('[data-card-id]', { hasText: 'Solo en este dispositivo' })).toHaveCount(0)

  await page.reload()
  await expect(deskCard(page, 'compras')).toBeVisible()
  await expect(deskCard(page, 'viaje')).toBeVisible()
  expect(await storedData(page)).toEqual(seeded)
})

test('a file that is not a Backup is refused with a message and changes nothing', async ({ page }) => {
  await seedDesk(page, seeded)
  const before = await page.evaluate(() => localStorage.getItem('mtf_data'))

  await openSettings(page)
  await page.locator('input[type="file"]').setInputFiles({
    name: 'notas.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ notas: ['hola'] })),
  })

  await expect(page.getByRole('alert')).toContainText('Este archivo no es una copia de MTF')
  await expect(page.getByRole('button', { name: 'Reemplazar mis datos' })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('mtf_data'))).toBe(before)
})

test('export and import work offline, with no request leaving the origin', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const foreign: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) foreign.push(request.url())
  })

  await seedDesk(page, seeded)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.reload()
  await expect(deskCard(page, 'compras')).toBeVisible()

  const { path } = await exportBackup(page)
  await writeNewCard(page, 'Sin señal')
  await importBackup(page, path)

  expect(await storedData(page)).toEqual(seeded)
  expect(foreign).toEqual([])
})
