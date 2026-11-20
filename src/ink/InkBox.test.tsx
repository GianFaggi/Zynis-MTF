import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})
