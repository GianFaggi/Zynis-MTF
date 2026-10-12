import { expect, test } from '@playwright/test'
import { cardColor, center, cssColor, openApp, storedData, zoomInIfFar } from './helpers.ts'

test.use({ locale: 'es-AR' })

test('create, check, reload, Place and delete a Card through the UI', async ({ page, isMobile }) => {
  await openApp(page)

  // Create with +: the editor opens with the title focused.
  await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
  const editor = page.getByRole('dialog', { name: 'Tarjeta' })
  await expect(editor).toBeVisible()
  await expect(editor.getByRole('textbox', { name: 'Título' })).toBeFocused()
  await page.keyboard.type('Compras')
  await editor.getByRole('button', { name: 'Añadir elemento' }).click()
  await expect(editor.getByRole('textbox', { name: 'Texto del elemento' })).toBeFocused()
  await page.keyboard.type('Pan')
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(editor).toBeHidden()

  // Check the Item right on the Desk: it does not open the editor.
  const compras = page.locator('[data-card-id]', { hasText: 'Compras' })
  await zoomInIfFar(page, await center(compras))
  await compras.getByRole('button', { name: 'Pan' }).click()
  await expect(compras.getByRole('button', { name: 'Pan' })).toHaveAttribute('aria-pressed', 'true')
  await expect(editor).toBeHidden()

  await page.reload()
  await expect(compras).toBeVisible()
  const [saved] = (await storedData(page)).cards
  expect(saved).toMatchObject({ title: 'Compras', items: [{ text: 'Pan', done: true }] })

  // A short tap or click opens it; Place moves it to Recordar and recolors it.
  if (isMobile) await compras.tap()
  else await compras.click()
  await expect(editor).toBeVisible()
  await editor.getByRole('combobox', { name: 'Lugar' }).selectOption({ label: 'Recordar' })
  expect(await cardColor(page, saved.id)).toBe(await cssColor(page, 'sky'))
  expect((await storedData(page)).cards[0].areaId).toBe((await storedData(page)).areas[2].id)

  // Delete takes two taps.
  await editor.getByRole('button', { name: 'Borrar' }).click()
  await editor.getByRole('button', { name: '¿Borrar? Tocá otra vez' }).click()
  await expect(editor).toBeHidden()
  await expect(compras).toHaveCount(0)
  expect((await storedData(page)).cards).toEqual([])
})

test('a new Card closed without writing is discarded', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('[data-card-id]')).toHaveCount(0)
  expect((await storedData(page)).cards).toEqual([])
})
