import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/appStore'
import { makeArea, makeCard, rowOfAreas } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { AreaEditor } from './AreaEditor'
import { AREA_COLORS } from './areas'
import { Desk } from './Desk'
import { useDeskStore } from './deskStore'

function area(id: string) {
  return useAppStore.getState().data.areas.find((candidate) => candidate.id === id)
}

function label(id: string) {
  return document.querySelector(`[data-area-label="${id}"]`)!.getAttribute('aria-label')
}

/** The Desk and the Area editor, open for `id`. */
function openAreaEditor(id: string, isNew = false) {
  useDeskStore.getState().openAreaEditor(id, { isNew })
  render(
    <>
      <Desk />
      <AreaEditor />
    </>,
  )
  return screen.getByRole('dialog', { name: 'Área' })
}

describe('AreaEditor', () => {
  beforeEach(() => {
    resetStores()
  })

  it('opens tinted with the Area color, with its name and a swatch for every Area color, the current one checked', () => {
    const dialog = openAreaEditor('a2')
    expect(dialog.style.getPropertyValue('--b')).toBe('var(--color-sand)')
    expect(within(dialog).getByRole('textbox', { name: 'Nombre' })).toHaveValue('Vida')
    const swatches = within(within(dialog).getByRole('radiogroup', { name: 'Color' })).getAllByRole('radio')
    expect(swatches).toHaveLength(AREA_COLORS.length)
    expect(AREA_COLORS).toHaveLength(12)
    expect(within(dialog).getByRole('radio', { name: 'Arena' })).toBeChecked()
  })

  it('renaming updates the label on the Desk as it is typed', async () => {
    openAreaEditor('a1')
    const name = screen.getByRole('textbox', { name: 'Nombre' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Oficina')
    expect(label('a1')).toBe('Oficina, 0 tarjetas')
    expect(area('a1')?.name).toBe('Oficina')
  })

  it('clearing the name of a default Area brings "Trabajo" back on close', async () => {
    resetStores({ areas: [{ ...rowOfAreas()[0], name: 'Oficina' }, ...rowOfAreas().slice(1)] })
    openAreaEditor('a1')
    await userEvent.clear(screen.getByRole('textbox', { name: 'Nombre' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(area('a1')).not.toHaveProperty('name')
    expect(label('a1')).toBe('Trabajo, 0 tarjetas')
  })

  it('a custom Area erased letter by letter keeps the name it had when the editor opened', async () => {
    resetStores({ areas: [...rowOfAreas(), makeArea({ id: 'a4', name: 'Facu', rect: { x: 80, y: 1280, w: 980, h: 1000 } })] })
    openAreaEditor('a4')
    await userEvent.type(screen.getByRole('textbox', { name: 'Nombre' }), '{Backspace>4/}')
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(area('a4')?.name).toBe('Facu')
  })

  it('a swatch recolors the Area and the editor at once', async () => {
    const dialog = openAreaEditor('a2')
    await userEvent.click(screen.getByRole('radio', { name: 'Verde azulado' }))
    expect(area('a2')?.color).toBe('teal')
    expect(dialog.style.getPropertyValue('--b')).toBe('var(--color-teal)')
    expect(screen.getByRole('radio', { name: 'Verde azulado' })).toBeChecked()
  })

  it('selects the whole name of a new Area, so typing replaces it', async () => {
    resetStores({ areas: [...rowOfAreas(), makeArea({ id: 'a4', name: 'Área nueva', rect: { x: 80, y: 1280, w: 980, h: 1000 } })] })
    openAreaEditor('a4', true)
    const name = screen.getByRole('textbox', { name: 'Nombre' }) as HTMLInputElement
    expect(name).toHaveFocus()
    expect([name.selectionStart, name.selectionEnd]).toEqual([0, 'Área nueva'.length])

    await userEvent.keyboard('Facu')
    expect(area('a4')?.name).toBe('Facu')
  })

  describe('delete', () => {
    beforeEach(() => {
      resetStores({
        cards: [
          makeCard({ id: 'c1', areaId: 'a2', title: 'Uno' }),
          makeCard({ id: 'c2', areaId: 'a2', title: 'Dos' }),
          makeCard({ id: 'c3', areaId: 'a2', title: 'Tres', jarredAt: 5 }),
        ],
      })
    })

    it('asks where the Cards go, nearest Area first, and moves them to the chosen one', async () => {
      openAreaEditor('a2')
      await userEvent.click(screen.getByRole('button', { name: 'Borrar área' }))
      const destination = screen.getByRole('combobox', { name: 'Sus 3 tarjetas pasan a' })
      expect(within(destination).getAllByRole('option').map((option) => option.textContent)).toEqual(['Trabajo', 'Recordar'])
      expect(destination).toHaveValue('a1')

      await userEvent.selectOptions(destination, 'a3')
      await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(area('a2')).toBeUndefined()
      expect(useAppStore.getState().data.cards.map((card) => card.areaId)).toEqual(['a3', 'a3', 'a3'])
      expect(useDeskStore.getState().toast).toMatchObject({ title: 'Área borrada', detail: '3 tarjetas pasaron a Recordar' })
    })

    it('offers Vida first when deleting Recordar', async () => {
      resetStores({ cards: [makeCard({ id: 'c1', areaId: 'a3' })] })
      openAreaEditor('a3')
      await userEvent.click(screen.getByRole('button', { name: 'Borrar área' }))
      expect(screen.getByRole('combobox', { name: 'Su tarjeta pasa a' })).toHaveValue('a2')
    })

    it('just asks for an Area with no Cards', async () => {
      openAreaEditor('a3')
      await userEvent.click(screen.getByRole('button', { name: 'Borrar área' }))
      expect(screen.getByText('¿Borrar el área?')).toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
      expect(area('a3')).toBeUndefined()
      expect(useDeskStore.getState().toast).toMatchObject({ title: 'Área borrada', detail: undefined })
    })

    it('Cancelar, or closing the editor, changes nothing', async () => {
      const before = useAppStore.getState().data
      openAreaEditor('a2')
      await userEvent.click(screen.getByRole('button', { name: 'Borrar área' }))
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(screen.getByRole('button', { name: 'Borrar área' })).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Borrar área' }))
      await userEvent.keyboard('{Escape}')
      expect(useAppStore.getState().data).toBe(before)
    })
  })

  it('the last Area cannot be deleted, and the editor says why', () => {
    resetStores({ areas: [rowOfAreas()[0]] })
    openAreaEditor('a1')
    expect(screen.getByRole('button', { name: 'Borrar área' })).toBeDisabled()
    expect(screen.getByText('El escritorio necesita al menos un área.')).toBeInTheDocument()
  })

  it('uses no accent anywhere', () => {
    const dialog = openAreaEditor('a2')
    for (const element of [dialog, ...dialog.querySelectorAll('*')]) expect(element.getAttribute('class') ?? '').not.toMatch(/accent/)
  })
})
