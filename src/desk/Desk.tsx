import { useGesture } from '@use-gesture/react'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Area, AreaColor } from '../types'
import { AreaRegion } from './AreaRegion'
import { areaForPoint } from './areas'
import { DeskCard } from './DeskCard'
import { useDeskStore } from './deskStore'
import { measureCardHeights, viewport } from './dom'
import {
  CARD_WIDTH,
  FALLBACK_CARD_HEIGHT,
  FAR_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  areaView,
  initialView,
  toWorld,
  type Point,
  type View,
} from './geometry'
import { HOLD_MS, nextIntent, releaseOutcome, type Intent, type PointerKind } from './intent'

// The Desk (KB/frontend/desk.md, ADR 0003): one world `div` moved with a CSS
// transform, and one gesture controller for the whole surface. Gesture frames write
// the DOM directly; the stores hear about a pan through `setView` (applied to the DOM
// by a subscription, not by rendering) and about a Card drag only once, on drop.

/** One press on the Desk, from pointer down to release. */
interface Press {
  intent: Intent | 'ignore'
  pointerType: PointerKind
  /** Furthest distance from the press point, in screen px. */
  distance: number
  held: boolean
  timer?: ReturnType<typeof setTimeout>
  /** The Area label the press started on. */
  labelAreaId: string | null
  /** The Card the press started on; `offset` is the drag so far in Desk px. */
  card: { id: string; element: HTMLElement; height: number; offset: Point } | null
  /** Where the pan starts from: the view and the pointer movement at that moment. */
  panStart: { view: View; movement: [number, number] }
}

/** Presses that start here are left to the control (e.g. an Item's box never starts a drag). */
const CONTROLS = 'button, input, textarea, select, a'
/** A click after a press that moved this far belongs to the gesture, not to a control. */
const CLICK_SLOP_PX = 6
/** The grain tile (see `paper-grain`); the grain layer is one tile larger than the screen. */
const GRAIN_TILE = 220
const HOLD_VIBRATION_MS = 12

/** A remainder that is never negative, so the grain only ever moves within one tile. */
function mod(value: number, size: number) {
  return ((value % size) + size) % size
}

function pointerKind(event: Event): PointerKind {
  const type = (event as PointerEvent).pointerType
  return type === 'touch' || type === 'pen' ? type : 'mouse'
}

function beginPress(event: Event): Press {
  const target = event.target as Element
  const press: Press = {
    intent: 'pan',
    pointerType: pointerKind(event),
    distance: 0,
    held: false,
    labelAreaId: null,
    card: null,
    panStart: { view: useDeskStore.getState().view, movement: [0, 0] },
  }
  const label = target.closest<HTMLElement>('[data-area-label]')
  if (label) return { ...press, labelAreaId: label.dataset.areaLabel! }
  if (target.closest(CONTROLS)) return { ...press, intent: 'ignore' }
  const card = target.closest<HTMLElement>('[data-card-id]')
  if (card) {
    return {
      ...press,
      intent: 'pending',
      card: { id: card.dataset.cardId!, element: card, height: FALLBACK_CARD_HEIGHT, offset: { x: 0, y: 0 } },
    }
  }
  return press
}

function findCard(id: string) {
  return useAppStore.getState().data.cards.find((card) => card.id === id)
}

/** Picks the Card up: the raised look, drawn above everything. */
function lift(press: Press) {
  if (!press.card) return
  press.card.height = measureCardHeights().get(press.card.id) ?? FALLBACK_CARD_HEIGHT
  press.card.element.setAttribute('data-lifted', '')
}

/** Moves the lifted Card with the pointer and previews the color of the Area it would join. */
function follow(press: Press, [mx, my]: [number, number]) {
  const lifted = press.card
  const card = lifted && findCard(lifted.id)
  if (!lifted || !card) return
  const { s } = useDeskStore.getState().view
  lifted.offset = { x: mx / s, y: my / s }
  lifted.element.style.translate = `${lifted.offset.x}px ${lifted.offset.y}px`

  const center = {
    x: card.position.x + lifted.offset.x + CARD_WIDTH / 2,
    y: card.position.y + lifted.offset.y + lifted.height / 2,
  }
  const area = areaForPoint(useAppStore.getState().data.areas, center)
  if (area) lifted.element.style.setProperty('--b-preview', `var(--color-${area.color})`)
}

/** Clears everything the drag wrote to the DOM; React's styles show the stored place again. */
function settle(press: Press) {
  const element = press.card?.element
  if (!element) return
  element.removeAttribute('data-lifted')
  element.style.translate = ''
  element.style.removeProperty('--b-preview')
}

function drop(press: Press) {
  const lifted = press.card
  const card = lifted && findCard(lifted.id)
  if (lifted && card) {
    useAppStore
      .getState()
      .dropCard(lifted.id, { x: card.position.x + lifted.offset.x, y: card.position.y + lifted.offset.y }, lifted.height)
  }
  settle(press)
}

/** Stops a press for good, e.g. when a second finger starts a pinch: a lifted Card goes back. */
function abandon(press: Press | null) {
  if (!press) return
  clearTimeout(press.timer)
  if (press.intent === 'drag') settle(press)
  press.intent = 'ignore'
}

function flyToArea(area: Area) {
  useDeskStore.getState().flyTo(areaView(area, viewport()))
}

export function Desk() {
  const t = useT()
  const areas = useAppStore((state) => state.data.areas)
  const cards = useAppStore((state) => state.data.cards)
  const deskRef = useRef<HTMLElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const grainRef = useRef<HTMLDivElement>(null)
  const press = useRef<Press | null>(null)
  const swallowClick = useRef(false)

  const onDesk = useMemo(() => cards.filter((card) => card.jarredAt === null), [cards])
  const counts = useMemo(() => {
    const byArea = new Map<string, number>()
    for (const card of onDesk) byArea.set(card.areaId, (byArea.get(card.areaId) ?? 0) + 1)
    return byArea
  }, [onDesk])
  const colors = useMemo(() => new Map<string, AreaColor>(areas.map((area) => [area.id, area.color])), [areas])

  // The view reaches the DOM through a subscription, never through a render.
  useLayoutEffect(() => {
    const world = worldRef.current!
    const grain = grainRef.current!
    const apply = ({ view: { x, y, s }, flying, tidying }: ReturnType<typeof useDeskStore.getState>) => {
      world.style.transform = `translate(${x}px, ${y}px) scale(${s})`
      world.toggleAttribute('data-far', s < FAR_SCALE)
      world.toggleAttribute('data-flying', flying)
      world.toggleAttribute('data-tidying', tidying)
      // Moved, never repainted: shifting by the pan modulo one tile keeps it seamless. It does not
      // scale with the zoom, because resizing the SVG noise every frame was most of the paint work.
      grain.style.transform = `translate(${mod(x, GRAIN_TILE)}px, ${mod(y, GRAIN_TILE)}px)`
    }
    apply(useDeskStore.getState())
    return useDeskStore.subscribe(apply)
  }, [])

  // The first view needs real Card heights, so it waits for the fonts.
  useEffect(() => {
    let cancelled = false
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return
      const { areas, cards } = useAppStore.getState().data
      useDeskStore.getState().setView(initialView(areas, cards, measureCardHeights(), viewport()))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useGesture(
    {
      onDrag: ({ first, last, event, movement }) => {
        if (first) {
          abandon(press.current)
          swallowClick.current = false
          press.current = beginPress(event)
          const started = press.current
          if (started.intent === 'pending' && started.pointerType === 'touch') {
            started.timer = setTimeout(() => {
              if (press.current !== started || started.intent !== 'pending') return
              started.held = true
              started.intent = nextIntent({ ...started, intent: 'pending' })
              lift(started)
              navigator.vibrate?.(HOLD_VIBRATION_MS)
            }, HOLD_MS)
          }
        }

        const current = press.current
        if (!current) return
        current.distance = Math.max(current.distance, Math.hypot(movement[0], movement[1]))

        if (current.intent !== 'ignore') {
          const before = current.intent
          current.intent = nextIntent({ ...current, intent: before })
          if (before === 'pending' && current.intent === 'pan') {
            clearTimeout(current.timer)
            current.panStart = { view: useDeskStore.getState().view, movement }
          }
          if (before !== 'drag' && current.intent === 'drag') lift(current)

          if (current.intent === 'pan' && !last) {
            const { view, movement: from } = current.panStart
            useDeskStore.getState().setView({ ...view, x: view.x + movement[0] - from[0], y: view.y + movement[1] - from[1] })
            deskRef.current?.toggleAttribute('data-panning', true)
          }
          if (current.intent === 'drag') follow(current, movement)
        }

        if (!last) return
        clearTimeout(current.timer)
        deskRef.current?.removeAttribute('data-panning')
        swallowClick.current = current.distance >= CLICK_SLOP_PX
        press.current = null
        if (current.intent === 'ignore') return

        const cancelled = event.type === 'pointercancel' || event.type === 'lostpointercapture'
        const outcome = releaseOutcome({
          intent: current.intent,
          distance: current.distance,
          onLabel: current.labelAreaId !== null,
        })
        if (outcome === 'drop') {
          if (cancelled) settle(current)
          else drop(current)
        } else if (outcome === 'open' && !cancelled && current.card) {
          useDeskStore.getState().openEditor(current.card.id)
        } else if (outcome === 'label' && !cancelled) {
          const area = useAppStore.getState().data.areas.find((candidate) => candidate.id === current.labelAreaId)
          if (area) flyToArea(area)
        }
      },

      onPinch: ({ first, origin: [ox, oy], offset: [s], memo }) => {
        // A second finger takes over: any pan, hold or Card drag in progress stops.
        if (first) abandon(press.current)
        const anchor: Point = first ? toWorld(useDeskStore.getState().view, { x: ox, y: oy }) : memo
        useDeskStore.getState().setView({ s, x: ox - anchor.x * s, y: oy - anchor.y * s })
        return anchor
      },

      onWheel: ({ event, delta: [dx, dy] }) => {
        if (event.ctrlKey || event.metaKey) return
        event.preventDefault()
        const { view } = useDeskStore.getState()
        useDeskStore.getState().setView({ ...view, x: view.x - dx, y: view.y - dy })
      },
    },
    {
      target: deskRef,
      eventOptions: { passive: false },
      drag: { keys: false, pointer: { capture: true } },
      pinch: {
        from: () => [useDeskStore.getState().view.s, 0],
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        modifierKey: ['ctrlKey', 'metaKey'],
        rubberband: false,
      },
    },
  )

  return (
    <section
      ref={deskRef}
      aria-label={t('desk')}
      onContextMenu={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (swallowClick.current && event.detail > 0) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      onDoubleClick={(event) => {
        if ((event.target as Element).closest(`[data-card-id], [data-area-label], ${CONTROLS}`)) return
        const point = toWorld(useDeskStore.getState().view, { x: event.clientX, y: event.clientY })
        const id = useAppStore.getState().createCard(point)
        if (id) useDeskStore.getState().openEditor(id, { isNew: true })
      }}
      className="fixed inset-0 cursor-grab touch-none overflow-hidden select-none [-webkit-touch-callout:none] data-panning:cursor-grabbing"
    >
      <div ref={grainRef} aria-hidden="true" className="paper-grain pointer-events-none absolute -top-[220px] -left-[220px] h-[calc(100%+220px)] w-[calc(100%+220px)] will-change-transform" />
      <div
        ref={worldRef}
        data-desk-world=""
        className="group absolute top-0 left-0 origin-top-left will-change-transform data-flying:transition-transform data-flying:duration-[550ms] data-flying:ease-[cubic-bezier(.3,.7,.2,1)]"
      >
        {areas.map((area) => (
          <AreaRegion key={area.id} area={area} count={counts.get(area.id) ?? 0} onFly={flyToArea} />
        ))}
        {onDesk.map((card) => (
          <DeskCard key={card.id} card={card} color={colors.get(card.areaId) ?? areas[0]?.color ?? 'sage'} />
        ))}
      </div>
    </section>
  )
}
