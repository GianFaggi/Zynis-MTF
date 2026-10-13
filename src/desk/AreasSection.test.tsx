import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/appStore'
import { rowOfAreas } from '../test/fixtures'
import { resetStores } from '../test/stores'
import { gridArrangement, rowArrangement, starArrangement } from './arrange'
import { AreasSection } from './AreasSection'
import { useDeskStore } from './deskStore'

function renderSection() {
  const onArranged = vi.fn()
  render(<AreasSection onOpenArea={() => {}} onCreated={() => {}} onArranged={onArranged} />)
  return { onArranged, group: screen.getByRole('group', { name: 'Acomodar áreas' }) }
}

/** The default Areas with Trabajo moved 300 px down by hand. */
function movedByHand() {
  const [work, ...others] = rowOfAreas()
  return [{ ...work, rect: { ...work.rect, y: work.rect.y + 300 } }, ...others]
}

describe('AreasSection: Acomodar áreas', () => {
  beforeEach(() => {
    resetStores()
  })

  it('offers Fila, Tabla, Estrella, Mi disposición and Guardar esta disposición, without the accent', () => {
    const { group } = renderSection()
    const names = within(group)
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(names).toEqual(['Fila', 'Tabla', 'Estrella', 'Mi disposición', 'Guardar esta disposición'])
    expect(group.outerHTML).not.toMatch(/accent/)
  })

  it('arranges at once when nothing would be lost: Fila on the default Desk', async () => {
    const { onArranged, group } = renderSection()
    await userEvent.click(within(group).getByRole('button', { name: 'Fila' }))
    expect(onArranged).toHaveBeenCalledExactlyOnceWith(rowArrangement(rowOfAreas()))
    expect(within(group).queryByText(/no está guardada/)).not.toBeInTheDocument()
  })

  it('after a hand move it asks first; Cancelar arranges nothing', async () => {
    resetStores({ areas: movedByHand() })
    const { onArranged, group } = renderSection()

    await userEvent.click(within(group).getByRole('button', { name: 'Estrella' }))
    expect(within(group).getByText('Tu disposición actual no está guardada. ¿Acomodar igual?')).toBeInTheDocument()
    expect(within(group).queryByRole('button', { name: 'Fila' })).not.toBeInTheDocument()
    await userEvent.click(within(group).getByRole('button', { name: 'Cancelar' }))

    expect(onArranged).not.toHaveBeenCalled()
    expect(within(group).getByRole('button', { name: 'Fila' })).toBeInTheDocument()
  })

  it('after a hand move, Acomodar reports the chosen arrangement', async () => {
    resetStores({ areas: movedByHand() })
    const { onArranged, group } = renderSection()

    await userEvent.click(within(group).getByRole('button', { name: 'Tabla' }))
    await userEvent.click(within(group).getByRole('button', { name: 'Acomodar' }))

    expect(onArranged).toHaveBeenCalledExactlyOnceWith(gridArrangement(movedByHand()))
    expect(within(group).queryByText(/no está guardada/)).not.toBeInTheDocument()
  })

  it('"Mi disposición" is unavailable until an arrangement is saved, then brings it back', async () => {
    resetStores({ areas: movedByHand() })
    const { onArranged, group } = renderSection()
    const mine = within(group).getByRole('button', { name: 'Mi disposición' })
    expect(mine).toBeDisabled()

    await userEvent.click(within(group).getByRole('button', { name: 'Guardar esta disposición' }))
    expect(useDeskStore.getState().toast).toMatchObject({ title: 'Disposición guardada' })
    expect(useAppStore.getState().arrangement?.rects.a1).toEqual(movedByHand()[0].rect)
    expect(mine).toBeEnabled()

    // The hand-made arrangement is saved now, so Estrella no longer asks.
    await userEvent.click(within(group).getByRole('button', { name: 'Estrella' }))
    expect(onArranged).toHaveBeenLastCalledWith(starArrangement(movedByHand()))

    useAppStore.getState().arrangeAreas(starArrangement(movedByHand()))
    await userEvent.click(mine)
    expect(onArranged).toHaveBeenLastCalledWith(new Map(movedByHand().map((area) => [area.id, area.rect])))
  })
})
