import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../store/appStore'
import { makeArea, makeCard, makeItem, rowOfAreas } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { CardEditor } from './CardEditor'
import { useDeskStore } from './deskStore'

function stored(id = 'c1') {
  return useAppStore.getState().data.cards.find((card) => card.id === id)
}

function openEditor(id = 'c1', isNew = false) {
  useDeskStore.getState().openEditor(id, { isNew })
  render(<CardEditor />)
  return screen.getByRole('dialog', { name: 'Tarjeta' })
}

describe('CardEditor', () => {
  beforeEach(() => {
    resetStores({ cards: [makeCard({ id: 'c1', areaId: 'a1', title: 'Viaje' })] })
  })

  it('opens tinted with the Card’s Area color, with a hidden "Tarjeta" title', () => {
    const dialog = openEditor()
    expect(dialog.style.getPropertyValue('--b')).toBe('var(--color-sage)')
    expect(within(dialog).getByRole('heading', { name: 'Tarjeta' })).toHaveClass('sr-only')
  })

  it('saves the title and text as they are typed', async () => {
    openEditor()
    const title = screen.getByRole('textbox', { name: 'Título' })
    await userEvent.clear(title)
    await userEvent.type(title, 'Viaje a Córdoba')
    expect(stored()!.title).toBe('Viaje a Córdoba')

    await userEvent.type(screen.getByRole('textbox', { name: 'Escribí algo…' }), 'Salimos')
    expect(stored()!.body).toBe('Salimos')
  })

  it('focuses the title of a new Card', () => {
    openEditor('c1', true)
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveFocus()
  })

  it('"Añadir elemento" opens an empty Item with the cursor in it; what is typed is the Item', async () => {
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }))
    const item = screen.getByRole('textbox', { name: 'Texto del elemento' })
    expect(item).toHaveFocus()

    await userEvent.keyboard('Pan')
    expect(stored()!.items.map((i) => [i.text, i.done])).toEqual([['Pan', false]])
  })

  it('Enter puts the keyboard away and keeps the Item; the next one goes below', async () => {
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }))
    await userEvent.keyboard('Pan{Enter}')
    expect(screen.getByRole('textbox', { name: 'Texto del elemento' })).not.toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }))
    await userEvent.keyboard('Leche{Enter}')
    expect(stored()!.items.map((i) => i.text)).toEqual(['Pan', 'Leche'])
  })

  it('Guardar right after typing keeps the Item', async () => {
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }))
    await userEvent.keyboard('Pan')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored()!.items.map((i) => i.text)).toEqual(['Pan'])
  })

  it('an Item opened and left without text goes away', async () => {
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }))
    await userEvent.click(screen.getByRole('textbox', { name: 'Título' }))

    expect(screen.queryByRole('textbox', { name: 'Texto del elemento' })).not.toBeInTheDocument()
    expect(stored()!.items).toEqual([])
  })

  it('checks, edits and removes an Item', async () => {
    resetStores({ cards: [makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan' }), makeItem({ id: 'i2', text: 'Leche' })] })] })
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Leche' }))
    await userEvent.type(screen.getAllByRole('textbox', { name: 'Texto del elemento' })[0], ' lactal')
    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar elemento' })[1])

    expect(stored()!.items.map((item) => [item.text, item.done])).toEqual([['Pan lactal', false]])
  })

  it('drops an Item left blank when it closes', async () => {
    resetStores({ cards: [makeCard({ id: 'c1', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan' })] })] })
    openEditor()
    await userEvent.clear(screen.getByRole('textbox', { name: 'Texto del elemento' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(stored()!.items).toEqual([])
  })

  it('Place lists every stored Area and moves the Card without dragging', async () => {
    const fourth = makeArea({ id: 'a4', name: 'Facu', color: 'plum', rect: { x: 80, y: 1300, w: 980, h: 600 } })
    resetStores({ areas: [...rowOfAreas(), fourth], cards: [makeCard({ id: 'c1', areaId: 'a1', title: 'Viaje' })] })
    const dialog = openEditor()
    const place = screen.getByRole('combobox', { name: 'Lugar' })

    expect(within(place).getAllByRole('option').map((option) => option.textContent)).toEqual(['Trabajo', 'Vida', 'Recordar', 'Facu'])
    expect(place).toHaveValue('a1')

    await userEvent.selectOptions(place, 'Facu')
    expect(stored()!.areaId).toBe('a4')
    expect(stored()!.position.y).toBeGreaterThanOrEqual(1300)
    expect(dialog.style.getPropertyValue('--b')).toBe('var(--color-plum)')
  })

  it('pins and unpins', async () => {
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Fijar' }))
    expect(stored()!.pinned).toBe(true)
    expect(screen.getByRole('button', { name: 'Fijada' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('one Delete tap asks again; closing then keeps the Card', async () => {
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(screen.getByRole('button', { name: '¿Borrar? Tocá otra vez' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored()).toBeDefined()
  })

  it('two Delete taps remove the Card and close the editor', async () => {
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    await userEvent.click(screen.getByRole('button', { name: '¿Borrar? Tocá otra vez' }))

    expect(stored()).toBeUndefined()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useDeskStore.getState().editingId).toBeNull()
  })

  it('closing a new Card left empty discards it', async () => {
    const id = useAppStore.getState().createCard({ x: 500, y: 500 })!
    openEditor(id, true)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(stored(id)).toBeUndefined()
  })

  it('closing a new Card that was written counts a note', async () => {
    const id = useAppStore.getState().createCard({ x: 500, y: 500 })!
    openEditor(id, true)
    await userEvent.type(screen.getByRole('textbox', { name: 'Título' }), 'Idea')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(useAppStore.getState().data.events.map((event) => [event.type, event.cardId])).toEqual([['note', id]])
  })

  it('checking an Item in the editor counts it, and the last one celebrates', async () => {
    resetStores({ cards: [makeCard({ id: 'c1', items: [makeItem({ id: 'i1', text: 'Pan', done: true }), makeItem({ id: 'i2', text: 'Leche' })] })] })
    openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Leche' }))
    expect(useDeskStore.getState().toast?.title).toBe('¡Tarjeta completa!')
    expect(useDeskStore.getState().winsBump).toBe(1)
  })

  describe('"Llevar al frasco"', () => {
    const pending = Array.from({ length: 3 }, (_, i) => makeItem({ id: `p${i}`, text: `Falta ${i}` }))

    it('refuses a Card with unchecked Items: the editor stays open and says how many are left', async () => {
      resetStores({ cards: [makeCard({ id: 'c1', title: 'Mudanza', items: pending })] })
      openEditor()
      await userEvent.click(screen.getByRole('button', { name: 'Llevar al frasco' }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(useDeskStore.getState().toast).toMatchObject({ title: 'Todavía no', detail: 'Te faltan 3 elementos' })
      expect(stored()!.jarredAt).toBeNull()
    })

    it('puts a finished Card in the Jar and closes the editor', async () => {
      resetStores({ cards: [makeCard({ id: 'c1', title: 'Compras', items: [makeItem({ id: 'i1', text: 'Pan', done: true })] })] })
      openEditor()
      await userEvent.click(screen.getByRole('button', { name: 'Llevar al frasco' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(stored()!.jarredAt).not.toBeNull()
      expect(useDeskStore.getState().toast?.title).toBe('¡Al frasco!')
    })

    it('a new Card put in the Jar from the editor also counts its note', async () => {
      const id = useAppStore.getState().createCard({ x: 500, y: 500 })!
      openEditor(id, true)
      await userEvent.type(screen.getByRole('textbox', { name: 'Título' }), 'Llamar al banco')
      await userEvent.click(screen.getByRole('button', { name: 'Llevar al frasco' }))

      expect(stored(id)!.jarredAt).not.toBeNull()
      expect(useAppStore.getState().data.events.map((event) => event.type).sort()).toEqual(['card', 'note'])
    })

    it('is unavailable while the Card is empty', () => {
      const id = useAppStore.getState().createCard({ x: 500, y: 500 })!
      openEditor(id, true)
      expect(screen.getByRole('button', { name: 'Llevar al frasco' })).toBeDisabled()
    })
  })
})
