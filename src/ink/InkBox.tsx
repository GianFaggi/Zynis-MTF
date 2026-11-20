import { Eraser, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '../components/ui/Button'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Ink } from '../types'
import { INK_INITIAL_HEIGHT, INK_UNDO_LIMIT, INK_WIDTH } from './constants'
import { eraseSegment } from './erase'
import { addStroke, appendPoint, inkPressure, toBoxPoint, type BoxRect } from './geometry'
import { inkPointer, isEraserEnd, pointerDown, type InkPointer } from './input'
import { inkPaths, strokePath } from './render'

/** A box with nothing written yet. Shared and never mutated, like every `Ink`. */
const EMPTY_INK: Ink = { height: INK_INITIAL_HEIGHT, strokes: [] }

/** The pointer drawing or erasing right now. Lives in a ref: only a finished stroke reaches the store. */
interface Live {
  pointerId: number
  pointerType: InkPointer
  /** The box on screen when the stroke started. */
  rect: BoxRect
  erase: boolean
  /** Drawing: the stroke's points so far. */
  points: number[]
  /** Erasing: the strokes still standing, and where the eraser last was. */
  strokes: number[][]
  last: { x: number; y: number } | null
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
 * on `pointerup`, through `setInk`. Undo keeps the previous `Ink` values of this session.
 */
export function InkBox({ cardId, ink: stored }: InkBoxProps) {
  const t = useT()
  const ink = stored ?? EMPTY_INK
  const livePath = useRef<SVGPathElement>(null)
  const live = useRef<Live | null>(null)
  const frame = useRef(0)
  const penSeen = useRef(false)
  const [eraser, setEraser] = useState(false)
  /** The strokes left while an eraser pass is live; `null` when none is. */
  const [erasing, setErasing] = useState<number[][] | null>(null)
  const [undo, setUndo] = useState<Ink[]>([])
  const [confirmClear, setConfirmClear] = useState(false)
  const [full, setFull] = useState(false)

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
      livePath.current?.setAttribute('d', current && !current.erase ? strokePath(current.points, false) : '')
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
        setErasing(kept)
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
    const current: Live = {
      pointerId: event.pointerId,
      pointerType,
      rect: { left, top, width },
      erase: eraser || isEraserEnd(pointerType, event.buttons),
      points: [],
      strokes: ink.strokes,
      last: null,
    }
    live.current = current
    setConfirmClear(false)
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
      commit({ ...ink, strokes: current.strokes })
      setFull(false)
      return
    }
    const next = addStroke(ink, current.points)
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

  const clearAll = () => {
    if (!confirmClear) return setConfirmClear(true)
    setConfirmClear(false)
    commit(EMPTY_INK)
    setFull(false)
  }

  const shown = erasing ? { ...ink, strokes: erasing } : ink

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
          {inkPaths(shown).map((d, index) => (
            <path key={index} d={d} />
          ))}
          <path ref={livePath} />
        </svg>
      </div>
      {full && (
        <p role="status" className="text-[13px] text-pencil">
          {t('inkFull')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
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
