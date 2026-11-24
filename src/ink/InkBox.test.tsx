import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sheet } from '../components/ui/Sheet'
import { useAppStore } from '../store/appStore'
import { makeCard } from '../test/fixtures'
import { resetStores } from '../test/stores'
import type { Ink } from '../types'
import { INK_MAX_POINTS } from './constants'
import { InkBox } from './InkBox'

// jsdom has no layout and no pointer capture: the box is stubbed 500 px wide at (0, 0),
// so one screen px is 2 ink units, and capture is a no-op. The logic itself is unit-tested
// in geometry, input, erase and render; this checks the box wires it up.

function storedInk(): Ink | undefined {
  return useAppStore.getState().data.cards.find((card) => card.id === 'c1')?.ink
}

function Harness() {
  const ink = useAppStore((state) => state.data.cards.find((card) => card.id === 'c1')?.ink)
  return <InkBox cardId="c1" ink={ink} />
}

function box() {
  return screen.getByRole('img', { name: 'Espacio para escribir a mano' })
}

type Pointer = { pointerType: 'mouse' | 'pen' | 'touch'; pointerId?: number; pressure?: number; buttons?: number }

function down(pointer: Pointer, x: number, y: number) {
  fireEvent.pointerDown(box(), { pointerId: 1, button: 0, buttons: 1, ...pointer, clientX: x, clientY: y })
}
function move(pointer: Pointer, x: number, y: number) {
  fireEvent.pointerMove(box(), { pointerId: 1, buttons: 1, ...pointer, clientX: x, clientY: y })
}
function up(pointer: Pointer, x: number, y: number) {
  fireEvent.pointerUp(box(), { pointerId: 1, ...pointer, clientX: x, clientY: y })
}

/** A whole stroke through `points` (screen px). */
function stroke(pointer: Pointer, points: [number, number][]) {
  const [first, ...rest] = points
  down(pointer, ...first)
  for (const point of rest) move(pointer, ...point)
  up(pointer, ...points.at(-1)!)
}

const mouse: Pointer = { pointerType: 'mouse' }
const finger: Pointer = { pointerType: 'touch' }
const pen: Pointer = { pointerType: 'pen', pressure: 0.8 }

describe('InkBox', () => {
  beforeEach(() => {
    resetStores({ cards: [makeCard({ id: 'c1', title: 'Viaje' })] })
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn(() => true)
    Element.prototype.releasePointerCapture = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 0, y: 0, width: 500, height: 200 }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a mouse stroke is written once, when it ends, in box units with an even pressure', () => {
    render(<Harness />)
    const writes = vi.fn()
    const stop = useAppStore.subscribe((state, previous) => state.data !== previous.data && writes())

    down(mouse, 10, 10)
    move(mouse, 60, 40)
    move(mouse, 110, 10)
    expect(writes).not.toHaveBeenCalled()
    up(mouse, 110, 10)
    stop()

    expect(writes).toHaveBeenCalledTimes(1)
    expect(storedInk()).toEqual({ height: 400, strokes: [[20, 20, 50, 120, 80, 50, 220, 20, 50]] })
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(1)
  })

  it('keeps a pen’s pressure', () => {
    render(<Harness />)
    stroke(pen, [[10, 10]])
    expect(storedInk()!.strokes).toEqual([[20, 20, 80]])
  })

  it('a right click does not draw', () => {
    render(<Harness />)
    fireEvent.pointerDown(box(), { pointerId: 1, pointerType: 'mouse', button: 2, clientX: 10, clientY: 10 })
    up(mouse, 10, 10)
    expect(storedInk()).toBeUndefined()
  })

  it('the finger draws until a pen touches the box, then is ignored', () => {
    render(<Harness />)
    stroke(finger, [[10, 10], [50, 10]])
    expect(storedInk()!.strokes).toHaveLength(1)

    stroke({ ...pen, pointerId: 2 }, [[10, 50], [50, 50]])
    expect(storedInk()!.strokes).toHaveLength(2)

    const prevented = !fireEvent.pointerDown(box(), { pointerId: 3, pointerType: 'touch', button: 0, clientX: 10, clientY: 90 })
    up({ ...finger, pointerId: 3 }, 50, 90)
    expect(prevented).toBe(false)
    expect(storedInk()!.strokes).toHaveLength(2)
  })

  it('palm first: a pen during a finger stroke discards that stroke and keeps only the pen’s', () => {
    render(<Harness />)
    down({ ...finger, pointerId: 1 }, 10, 10)
    move({ ...finger, pointerId: 1 }, 80, 80)
    stroke({ ...pen, pointerId: 2 }, [[100, 20], [150, 20]])
    up({ ...finger, pointerId: 1 }, 80, 80)
    expect(storedInk()!.strokes).toEqual([[200, 40, 80, 300, 40, 80]])
  })

  it('a cancelled stroke is dropped', () => {
    render(<Harness />)
    down(mouse, 10, 10)
    move(mouse, 60, 10)
    fireEvent.pointerCancel(box(), { pointerId: 1, pointerType: 'mouse' })
    up(mouse, 60, 10)
    expect(storedInk()).toBeUndefined()
  })

  it('the box grows when a stroke ends near its bottom', () => {
    render(<Harness />)
    stroke(mouse, [[10, 180]])
    expect(storedInk()!.height).toBe(650)
    expect(box().style.aspectRatio).toBe('1000 / 650')
  })

  it('undo takes back a stroke, an erase pass and a clear, one at a time', async () => {
    render(<Harness />)
    const undo = screen.getByRole('button', { name: 'Deshacer' })
    expect(undo).toBeDisabled()

    stroke(mouse, [[10, 10], [100, 10]])
    stroke(mouse, [[10, 60], [100, 60]])
    const two = storedInk()!.strokes

    await userEvent.click(screen.getByRole('button', { name: 'Borrador' }))
    stroke(mouse, [[50, 0], [50, 30]])
    expect(storedInk()!.strokes).toEqual([two[1]])

    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    await userEvent.click(screen.getByRole('button', { name: '¿Borrar todo? Tocá otra vez' }))
    expect(storedInk()!.strokes).toEqual([])

    await userEvent.click(undo)
    expect(storedInk()!.strokes).toEqual([two[1]])
    await userEvent.click(undo)
    expect(storedInk()!.strokes).toEqual(two)
    await userEvent.click(undo)
    expect(storedInk()!.strokes).toEqual([two[0]])
    await userEvent.click(undo)
    expect(storedInk()!.strokes).toEqual([])
    expect(undo).toBeDisabled()
  })

  it('Ctrl+Z and ⌘Z take back the last stroke, like "Deshacer"', async () => {
    render(<Harness />)
    stroke(mouse, [[10, 10], [100, 10]])
    stroke(mouse, [[10, 60], [100, 60]])
    const first = storedInk()!.strokes[0]

    await userEvent.keyboard('{Control>}z{/Control}')
    expect(storedInk()!.strokes).toEqual([first])
    await userEvent.keyboard('{Meta>}z{/Meta}')
    expect(storedInk()!.strokes).toEqual([])
  })

  it('Ctrl+Z while typing in a text field is left to the field; with Shift or nothing to undo it does nothing', async () => {
    render(
      <>
        <input aria-label="Título" />
        <textarea aria-label="Texto" />
        <Harness />
      </>,
    )
    stroke(mouse, [[10, 10], [100, 10]])
    const drawn = storedInk()!.strokes

    for (const name of ['Título', 'Texto']) {
      await userEvent.click(screen.getByLabelText(name))
      await userEvent.keyboard('{Control>}z{/Control}')
      expect(storedInk()!.strokes).toEqual(drawn)
    }
    ;(document.activeElement as HTMLElement).blur()
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(storedInk()!.strokes).toEqual(drawn)

    await userEvent.keyboard('{Control>}z{/Control}')
    expect(storedInk()!.strokes).toEqual([])
    const unhandled = fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(unhandled).toBe(true)
  })

  it('Ctrl+Z works with the pen editor’s slider focused, which has no undo of its own', async () => {
    render(<Harness />)
    stroke(mouse, [[10, 10], [100, 10]])
    await userEvent.click(screen.getByRole('button', { name: 'Tinta, Medio' }))
    screen.getByRole('slider', { name: 'Grosor exacto' }).focus()
    await userEvent.keyboard('{Control>}z{/Control}')
    expect(storedInk()!.strokes).toEqual([])
  })

  it('the eraser removes the whole stroke it passes over, and choosing it again goes back to writing', async () => {
    render(<Harness />)
    stroke(mouse, [[10, 10], [100, 10]])
    stroke(mouse, [[10, 60], [100, 60]])
    const eraser = screen.getByRole('button', { name: 'Borrador' })
    await userEvent.click(eraser)
    expect(eraser).toHaveAttribute('aria-pressed', 'true')
    stroke(mouse, [[50, 50], [50, 70]])
    expect(storedInk()!.strokes).toHaveLength(1)

    await userEvent.click(eraser)
    stroke(mouse, [[10, 90], [100, 90]])
    expect(storedInk()!.strokes).toHaveLength(2)
  })

  it('a pen’s eraser end erases without choosing the tool, and the tip still writes', () => {
    render(<Harness />)
    stroke(pen, [[10, 10], [100, 10]])
    stroke({ ...pen, buttons: 32 }, [[50, 0], [50, 30]])
    expect(storedInk()!.strokes).toEqual([])
    expect(screen.getByRole('button', { name: 'Borrador' })).toHaveAttribute('aria-pressed', 'false')
    stroke(pen, [[10, 50]])
    expect(storedInk()!.strokes).toHaveLength(1)
  })

  it('"Borrar todo" needs a second tap; drawing in between cancels it', async () => {
    render(<Harness />)
    stroke(mouse, [[10, 10], [100, 10]])
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    expect(storedInk()!.strokes).toHaveLength(1)

    stroke(mouse, [[10, 60], [100, 60]])
    expect(screen.queryByRole('button', { name: '¿Borrar todo? Tocá otra vez' })).toBeNull()
    expect(storedInk()!.strokes).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    await userEvent.click(screen.getByRole('button', { name: '¿Borrar todo? Tocá otra vez' }))
    expect(storedInk()!.strokes).toEqual([])
  })

  it('a stroke past the limit is not kept and the box says it is full, until something is erased', async () => {
    // Exactly at the limit: a long stroke plus one dot at (500, 300), which is (250, 150) on screen.
    const long = Array.from({ length: INK_MAX_POINTS - 1 }, (_, i) => [i % 1000, 5, 50]).flat()
    const full = { height: 400, strokes: [long, [500, 300, 50]] }
    act(() => useAppStore.getState().setInk('c1', full))
    render(<Harness />)

    stroke(mouse, [[10, 100], [100, 100], [100, 150]])
    expect(storedInk()).toBe(full)
    expect(screen.getByRole('status')).toHaveTextContent('Esta escritura está completa')

    await userEvent.click(screen.getByRole('button', { name: 'Borrador' }))
    stroke(mouse, [[240, 140], [260, 160]])
    expect(storedInk()!.strokes).toEqual([long])
    expect(screen.queryByRole('status')).toBeNull()

    // Erasing the dot left room for one point again.
    await userEvent.click(screen.getByRole('button', { name: 'Borrador' }))
    stroke(mouse, [[10, 100]])
    expect(storedInk()!.strokes).toEqual([long, [20, 200, 50]])
  })

  describe('pens (#51)', () => {
    const red = { color: '#d0443a', size: 12 }
    const green = { color: '#2f9a5e', size: 4 }

    function withPen(index: 0 | 1 | 2 | 3, style: { color: string | null; size: number }) {
      act(() => {
        useAppStore.getState().editPen(index, style)
        useAppStore.getState().choosePen(index)
      })
    }

    it('a stroke with a red Lápiz 2 is committed with that pen’s style', () => {
      render(<Harness />)
      withPen(1, red)
      stroke(mouse, [[10, 10], [100, 10]])
      expect(storedInk()!.styles).toEqual([red])
    })

    it('draws the live stroke in the chosen pen’s color, and a Tinta one with no fill', () => {
      const { container } = render(<Harness />)
      withPen(1, red)
      down(mouse, 10, 10)
      const live = container.querySelector('svg')!.lastElementChild!
      expect(live).toHaveAttribute('fill', '#d0443a')
      up(mouse, 10, 10)

      act(() => useAppStore.getState().choosePen(0))
      down(mouse, 10, 50)
      expect(live).not.toHaveAttribute('fill')
      up(mouse, 10, 50)
    })

    it('a session only in Tinta commits handwriting with no styles key', () => {
      render(<Harness />)
      stroke(mouse, [[10, 10], [100, 10]])
      stroke(pen, [[10, 60], [100, 60]])
      expect(storedInk()).not.toHaveProperty('styles')
    })

    it('erasing the middle of three styled strokes keeps the other two with their own styles, and undo brings it back with its style', async () => {
      render(<Harness />)
      withPen(1, red)
      stroke(mouse, [[10, 10], [100, 10]])
      withPen(2, green)
      stroke(mouse, [[10, 60], [100, 60]])
      withPen(0, { color: null, size: 7 })
      stroke(mouse, [[10, 110], [100, 110]])
      const [top, middle, bottom] = storedInk()!.strokes
      expect(storedInk()!.styles).toEqual([red, green, { color: null, size: 7 }])

      await userEvent.click(screen.getByRole('button', { name: 'Borrador' }))
      stroke(mouse, [[50, 50], [50, 70]])
      expect(storedInk()).toEqual({ height: 400, strokes: [top, bottom], styles: [red, { color: null, size: 7 }] })

      await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
      expect(storedInk()).toEqual({ height: 400, strokes: [top, middle, bottom], styles: [red, green, { color: null, size: 7 }] })
    })

    it('erasing every colored stroke leaves Tinta-only handwriting with no styles key', async () => {
      render(<Harness />)
      withPen(1, red)
      stroke(mouse, [[10, 10], [100, 10]])
      withPen(0, { color: null, size: 7 })
      stroke(mouse, [[10, 60], [100, 60]])
      await userEvent.click(screen.getByRole('button', { name: 'Borrador' }))
      stroke(mouse, [[50, 0], [50, 30]])
      expect(storedInk()).not.toHaveProperty('styles')
      expect(storedInk()!.strokes).toHaveLength(1)
    })

    it('"Borrar todo" leaves no styles', async () => {
      render(<Harness />)
      withPen(1, red)
      stroke(mouse, [[10, 10], [100, 10]])
      await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
      await userEvent.click(screen.getByRole('button', { name: '¿Borrar todo? Tocá otra vez' }))
      expect(storedInk()).toEqual({ height: 400, strokes: [] })
    })

    it('over styles a version without pens left misaligned, a new stroke turns the earlier ones to Tinta', () => {
      act(() => useAppStore.getState().setInk('c1', { height: 400, strokes: [[20, 20, 50]], styles: [red, green] }))
      render(<Harness />)
      withPen(1, red)
      stroke(mouse, [[10, 60]])
      expect(storedInk()!.styles).toEqual([{ color: null, size: 7 }, red])
    })
  })

  it('stops the system from selecting or scrolling, and never uses the accent', () => {
    const { container } = render(<Harness />)
    expect(box()).toHaveClass('touch-none', 'select-none', '[-webkit-touch-callout:none]')
    expect(fireEvent.pointerDown(box(), { pointerId: 1, pointerType: 'pen', button: 0, clientX: 5, clientY: 5 })).toBe(false)
    expect(container.innerHTML).not.toMatch(/accent/)
  })

  it('names its tools in English', () => {
    useAppStore.setState({ language: 'en' })
    render(<Harness />)
    expect(screen.getByRole('img', { name: 'Space to write by hand' })).toBeInTheDocument()
    for (const name of ['Undo', 'Eraser', 'Clear all']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
  })

  describe('the pen tray and editor (#51)', () => {
    const tinta = () => screen.getByRole('button', { name: /^Tinta,/ })
    const pen2 = () => screen.getByRole('button', { name: /^Lápiz 2,/ })
    const pen3 = () => screen.getByRole('button', { name: /^Lápiz 3,/ })
    const editor = () => screen.queryByRole('dialog')

    it('the tray comes first in the tool row, before Deshacer', () => {
      render(<Harness />)
      const buttons = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent)
      expect(buttons.slice(0, 5)).toEqual(['Tinta, Medio', 'Lápiz 2, Medio', 'Lápiz 3, Medio', 'Lápiz 4, Medio', 'Deshacer'])
    })

    it('tapping Lápiz 3 chooses it and the next stroke is drawn with it; tapping it again opens its editor', async () => {
      render(<Harness />)
      await userEvent.click(pen3())
      expect(pen3()).toHaveAttribute('aria-pressed', 'true')
      expect(editor()).toBeNull()
      stroke(mouse, [[10, 10], [100, 10]])
      expect(storedInk()!.styles).toEqual([{ color: '#d0443a', size: 7 }])

      await userEvent.click(pen3())
      expect(screen.getByRole('dialog', { name: 'Editar Lápiz 3' })).toBeInTheDocument()
    })

    it('a tap on a pen while the eraser is on turns the eraser off, opens no editor, and the next stroke draws', async () => {
      render(<Harness />)
      stroke(mouse, [[10, 10], [100, 10]])
      await userEvent.click(screen.getByRole('button', { name: 'Borrador' }))
      expect(tinta()).toHaveAttribute('aria-pressed', 'false')

      await userEvent.click(tinta())
      expect(screen.getByRole('button', { name: 'Borrador' })).toHaveAttribute('aria-pressed', 'false')
      expect(tinta()).toHaveAttribute('aria-pressed', 'true')
      expect(editor()).toBeNull()
      stroke(mouse, [[10, 60], [100, 60]])
      expect(storedInk()!.strokes).toHaveLength(2)
    })

    it('changing the color to green updates the pen’s dot and the next stroke, not the strokes already drawn', async () => {
      const { container } = render(<Harness />)
      await userEvent.click(pen2())
      stroke(mouse, [[10, 10], [100, 10]])
      await userEvent.click(pen2())
      fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#00ff00' } })
      expect(container.querySelectorAll<HTMLElement>('[data-pen-dot]')[1].style.backgroundColor).toBe('rgb(0, 255, 0)')
      await userEvent.click(screen.getByRole('button', { name: 'Listo' }))

      stroke(mouse, [[10, 60], [100, 60]])
      expect(storedInk()!.styles).toEqual([
        { color: '#3a78c2', size: 7 },
        { color: '#00ff00', size: 7 },
      ])
    })

    it('"Grueso" on Tinta makes the next Tinta strokes thicker, still with no color', async () => {
      render(<Harness />)
      await userEvent.click(tinta())
      await userEvent.click(screen.getByRole('button', { name: 'Grueso' }))
      expect(screen.getByRole('button', { name: 'Tinta, Grueso' })).toBeInTheDocument()
      stroke(mouse, [[10, 10], [100, 10]])
      expect(storedInk()!.styles).toEqual([{ color: null, size: 12 }])
    })

    it('Esc closes the pen editor but not the Card editor around it', async () => {
      const closeCard = vi.fn()
      render(
        <Sheet open title="Viaje" closeLabel="Cerrar" onClose={closeCard}>
          <Harness />
        </Sheet>,
      )
      await userEvent.click(tinta())
      expect(screen.getByRole('dialog', { name: 'Editar Tinta' })).toBeInTheDocument()
      expect(screen.getAllByRole('dialog')).toHaveLength(2)
      await userEvent.keyboard('{Escape}')
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(closeCard).not.toHaveBeenCalled()
      expect(tinta()).toHaveFocus()

      await userEvent.keyboard('{Escape}')
      expect(closeCard).toHaveBeenCalledOnce()
    })

    it('a press in the box closes the editor and draws', async () => {
      render(<Harness />)
      await userEvent.click(pen2())
      await userEvent.click(pen2())
      expect(editor()).not.toBeNull()
      act(() => stroke(mouse, [[10, 10], [100, 10]]))
      expect(editor()).toBeNull()
      expect(storedInk()!.strokes).toHaveLength(1)
    })

    it('a tap on another pen while the editor is open chooses it and closes the editor', async () => {
      render(<Harness />)
      await userEvent.click(tinta())
      expect(editor()).not.toBeNull()
      await userEvent.click(pen3())
      expect(editor()).toBeNull()
      expect(pen3()).toHaveAttribute('aria-pressed', 'true')
    })

    it('undo after editing a pen removes the stroke and keeps the pen’s new color', async () => {
      render(<Harness />)
      await userEvent.click(pen2())
      stroke(mouse, [[10, 10], [100, 10]])
      await userEvent.click(pen2())
      fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#00ff00' } })
      await userEvent.click(screen.getByRole('button', { name: 'Listo' }))
      await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
      expect(storedInk()!.strokes).toEqual([])
      expect(useAppStore.getState().pens.pens[1].color).toBe('#00ff00')
      expect(screen.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    })

    it('the chosen pen stays chosen in another Card’s box', async () => {
      const { unmount } = render(<Harness />)
      await userEvent.click(screen.getByRole('button', { name: /^Lápiz 4,/ }))
      unmount()
      render(<InkBox cardId="c2" ink={undefined} />)
      expect(screen.getByRole('button', { name: /^Lápiz 4,/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('never uses the accent, with the editor open', async () => {
      const { container } = render(<Harness />)
      await userEvent.click(pen2())
      await userEvent.click(pen2())
      expect(container.innerHTML).not.toMatch(/accent/)
    })

    it('reads the pens and widths in English', async () => {
      useAppStore.setState({ language: 'en' })
      render(<Harness />)
      await userEvent.click(screen.getByRole('button', { name: 'Ink, Medium' }))
      expect(screen.getByRole('dialog', { name: 'Edit Ink' })).toBeInTheDocument()
      for (const name of ['Fine', 'Medium', 'Bold']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    })
  })
})
