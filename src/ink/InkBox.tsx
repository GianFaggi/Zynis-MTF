import { Eraser, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '../components/ui/Button'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Ink, InkStyle } from '../types'
import { INK_INITIAL_HEIGHT, INK_UNDO_LIMIT, INK_WIDTH } from './constants'
import { eraseSegment } from './erase'
import { addStroke, appendPoint, inkPressure, toBoxPoint, type BoxRect } from './geometry'
import { inkPointer, isEraserEnd, pointerDown, type InkPointer } from './input'
import { PenEditor } from './PenEditor'
import { PenTray } from './PenTray'
import { inkPaths, strokePath } from './render'
import { strokeStyles, withStyles } from './style'

/** A box with nothing written yet. Shared and never mutated, like every `Ink`. */
const EMPTY_INK: Ink = { height: INK_INITIAL_HEIGHT, strokes: [] }

/** The pointer drawing or erasing right now. Lives in a ref: only a finished stroke reaches the store. */
interface Live {
  pointerId: number
  pointerType: InkPointer
  /** The box on screen when the stroke started. */
  rect: BoxRect
  erase: boolean
  /** Drawing: the stroke's points so far, and the pen it is drawn with. */
  points: number[]
  style: InkStyle
  /** Erasing: the strokes still standing, and where the eraser last was. */
  strokes: number[][]
  last: { x: number; y: number } | null
  /** Erasing: each stroke's style when the pass started. Stroke arrays are unique and never mutated (#51, design D3). */
  styleOf: Map<readonly number[], InkStyle>
}

/** Inputs that do not type: Ctrl+Z there is free for the box. Every other input, and textareas, keep their own undo. */
const NON_TEXT_INPUTS = new Set(['range', 'color', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image'])

/** Whether a key pressed on `target` belongs to text being typed, whose Ctrl+Z is the browser's. */
function typesText(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)
}

/** Ctrl+Z, or ⌘Z on a Mac; never with Shift or Alt, which are other shortcuts. */
function isUndoKey(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z'
}

/** `strokes` (some of `ink`'s, after an erase) with the style each had in `styleOf`. */
function keptInk(height: number, strokes: number[][], styleOf: Map<readonly number[], InkStyle>): Ink {
  return withStyles(height, strokes, strokes.map((stroke) => styleOf.get(stroke)!))
}

type InkBoxProps = {
  cardId: string
  /** The Card's handwriting; `undefined` for a box just added, with nothing written yet. */
  ink: Ink | undefined
}

/**
 * The handwriting box in the Card editor (#47, design D4–D7). It reads raw Pointer Events:
 * the pen and the mouse always draw, the finger draws until the box sees a pen (`penSeen`,
 * reset with each editor, since the editor body is keyed by Card). A stroke follows its
 * pointer through pointer capture, is drawn live in an animation frame, and is written once,
 * on `pointerup`, through `setInk`. Undo keeps the previous `Ink` values of this session, and
 * Ctrl+Z / ⌘Z does the same as its button unless the focus is typing text.
 * Each stroke is drawn and kept with the chosen pen's style (#51); an erase keeps the style
 * of every stroke left. Choosing or editing a pen is a device setting, never an undo step.
 */
export function InkBox({ cardId, ink: stored }: InkBoxProps) {
  const t = useT()
  const ink = stored ?? EMPTY_INK
  const pen = useAppStore((state) => state.pens.pens[state.pens.chosen])
  const livePath = useRef<SVGPathElement>(null)
  const live = useRef<Live | null>(null)
  const frame = useRef(0)
  const penSeen = useRef(false)
  const [eraser, setEraser] = useState(false)
  /** The handwriting left while an eraser pass is live; `null` when none is. */
  const [erasing, setErasing] = useState<Ink | null>(null)
  const [undo, setUndo] = useState<Ink[]>([])
  const [confirmClear, setConfirmClear] = useState(false)
  const [full, setFull] = useState(false)
  /** Whether the chosen pen's editor is open. */
  const [editingPen, setEditingPen] = useState(false)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  /** Writes a new value, keeping the current one to undo to. */
  const commit = (next: Ink) => {
    setUndo((stack) => [...stack, ink].slice(-INK_UNDO_LIMIT))
    useAppStore.getState().setInk(cardId, next)
  }

  const drawLive = () => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const current = live.current
      livePath.current?.setAttribute('d', current && !current.erase ? strokePath(current.points, false, current.style.size) : '')
    })
  }

  const endLive = () => {
    live.current = null
    cancelAnimationFrame(frame.current)
    frame.current = 0
    livePath.current?.setAttribute('d', '')
    setErasing(null)
  }

  const addPoints = (current: Live, events: readonly PointerEvent[]) => {
    for (const event of events) {
      const { x, y } = toBoxPoint(event.clientX, event.clientY, current.rect, ink.height)
      if (!current.erase) {
        appendPoint(current.points, x, y, inkPressure(current.pointerType, event.pressure))
        continue
      }
      const from = current.last ?? { x, y }
      current.last = { x, y }
      const kept = eraseSegment(current.strokes, from.x, from.y, x, y)
      if (kept !== current.strokes) {
        current.strokes = kept
        setErasing(keptInk(ink.height, kept, current.styleOf))
      }
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerType = inkPointer(event.pointerType)
    if (pointerType === 'mouse' && event.button !== 0) return
    const decision = pointerDown({ pointerType, penSeen: penSeen.current, live: live.current?.pointerType ?? null })
    // An ignored finger is not even prevented: it is as if the box were not there.
    if (decision === 'ignore') return
    const box = event.currentTarget
    const { left, top, width } = box.getBoundingClientRect()
    if (width === 0) return
    if (decision === 'replace') {
      // The palm landed just before the Pencil: whatever it started goes.
      const palm = live.current!.pointerId
      if (box.hasPointerCapture(palm)) box.releasePointerCapture(palm)
      endLive()
    }
    if (pointerType === 'pen') penSeen.current = true
    // No text selection, no iOS callout; capture keeps the stroke ours after it leaves the box.
    event.preventDefault()
    box.setPointerCapture(event.pointerId)
    const erase = eraser || isEraserEnd(pointerType, event.buttons)
    const styles = strokeStyles(ink)
    const current: Live = {
      pointerId: event.pointerId,
      pointerType,
      rect: { left, top, width },
      erase,
      points: [],
      style: pen,
      strokes: ink.strokes,
      last: null,
      styleOf: erase ? new Map(ink.strokes.map((stroke, index) => [stroke, styles[index]])) : new Map(),
    }
    live.current = current
    if (pen.color) livePath.current?.setAttribute('fill', pen.color)
    else livePath.current?.removeAttribute('fill')
    setConfirmClear(false)
    setEditingPen(false)
    addPoints(current, [event.nativeEvent])
    drawLive()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = live.current
    if (!current || event.pointerId !== current.pointerId) return
    // A Pencil reports ~240 points a second, the browser fires ~60 moves: coalesced events
    // hold the points in between, so curves stay round.
    const coalesced = event.nativeEvent.getCoalescedEvents?.()
    addPoints(current, coalesced && coalesced.length > 0 ? coalesced : [event.nativeEvent])
    drawLive()
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = live.current
    if (!current || event.pointerId !== current.pointerId) return
    endLive()
    if (current.erase) {
      if (current.strokes === ink.strokes) return
      commit(keptInk(ink.height, current.strokes, current.styleOf))
      setFull(false)
      return
    }
    const next = addStroke(ink, current.points, current.style)
    if (next === null) return setFull(true)
    if (next !== ink) commit(next)
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (live.current?.pointerId === event.pointerId) endLive()
  }

  const undoLast = () => {
    const previous = undo.at(-1)
    if (!previous) return
    setUndo((stack) => stack.slice(0, -1))
    useAppStore.getState().setInk(cardId, previous)
    setFull(false)
    setConfirmClear(false)
  }

  // Ctrl+Z / ⌘Z is "Deshacer" while the box is on screen, unless the focus is typing text
  // (the title, the text, an Item), which keeps the browser's own undo.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isUndoKey(event) || event.defaultPrevented || typesText(event.target)) return
    if (live.current || undo.length === 0) return
    event.preventDefault()
    undoLast()
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const clearAll = () => {
    if (!confirmClear) return setConfirmClear(true)
    setConfirmClear(false)
    commit(EMPTY_INK)
    setFull(false)
  }

  const shown = erasing ?? ink

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={t('inkBox')}
        data-ink-box=""
        data-eraser={eraser || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ aspectRatio: `${INK_WIDTH} / ${ink.height}` }}
        // A ring, not a border, so the box on screen is exactly the drawing area.
        className="relative w-full cursor-crosshair touch-none rounded-xl bg-sheet/60 text-ink ring-1 ring-rule select-none [-webkit-touch-callout:none] data-eraser:cursor-cell"
      >
        <svg viewBox={`0 0 ${INK_WIDTH} ${ink.height}`} aria-hidden="true" focusable="false" className="absolute inset-0 size-full fill-current">
          {inkPaths(shown).map(({ d, color }, index) => (
            <path key={index} d={d} fill={color ?? undefined} />
          ))}
          <path ref={livePath} />
        </svg>
      </div>
      {full && (
        <p role="status" className="text-[13px] text-pencil">
          {t('inkFull')}
        </p>
      )}
      <div className="relative flex flex-wrap items-center gap-2">
        <PenTray
          eraser={eraser}
          onChoose={() => {
            setEraser(false)
            setEditingPen(false)
            setConfirmClear(false)
          }}
          onEdit={() => setEditingPen(true)}
        />
        {editingPen && <PenEditor onClose={() => setEditingPen(false)} />}
        <Button onClick={undoLast} disabled={undo.length === 0}>
          <Undo2 size={15} aria-hidden="true" />
          {t('inkUndo')}
        </Button>
        <Button
          pressed={eraser}
          onClick={() => {
            setEraser((on) => !on)
            setConfirmClear(false)
          }}
        >
          <Eraser size={15} aria-hidden="true" />
          {t('inkEraser')}
        </Button>
        <Button variant="danger" onClick={clearAll} disabled={ink.strokes.length === 0}>
          <Trash2 size={15} aria-hidden="true" />
          {confirmClear ? t('inkClearConfirm') : t('inkClear')}
        </Button>
      </div>
    </div>
  )
}
