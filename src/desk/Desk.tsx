import { useGesture } from '@use-gesture/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Area, AreaColor, Card } from '../types'
import { useWinFeedback, type WinFeedback } from '../wins/feedback'
import { Jar } from '../wins/Jar'
import { areaJarRect, jarRect, jarTarget, type JarTarget } from '../wins/jarLayout'
import { JarMoveSheet } from '../wins/JarMoveSheet'
import { jarVerdict } from '../wins/rules'
import { AreaRegion } from './AreaRegion'
import { areaForPoint, areaName, overlapsAny, resizedRect } from './areas'
import { DeskCard } from './DeskCard'
import { useDeskStore } from './deskStore'
import { highlightJar, measureCardHeights, prefersReducedMotion, viewport } from './dom'
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
  type Rect,
  type View,
} from './geometry'
import { HOLD_MS, nextIntent, releaseOutcome, type Intent, type PointerKind } from './intent'

// The Desk (KB/frontend/desk.md, ADR 0003): one world `div` moved with a CSS
// transform, and one gesture controller for the whole surface. Gesture frames write
// the DOM directly; the stores hear about a pan through `setView` (applied to the DOM
// by a subscription, not by rendering), and about a Card drag or an Area move or
// resize only once, on release.

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
  /** The press started on a Jar: the Desk Jar (`jarAreaId` null) or an Area Jar. */
  onJar: boolean
  jarAreaId: string | null
  /** The Card the press started on; `offset` is the drag so far in Desk px. */
  card: { id: string; element: HTMLElement; height: number; offset: Point } | null
  /**
   * The Area moved by its label or resized by its handle: its wrapper, its Card elements
   * on the Desk (collected at lift), and the rect it would have if released now.
   */
  area: { id: string; wrapper: HTMLElement; cards: HTMLElement[]; rect: Rect | null } | null
  /** Where the pan starts from: the view and the pointer movement at that moment. */
  panStart: { view: View; movement: [number, number] }
}

/** A Card dropped on another Area's Jar, waiting lifted for the answer to "¿Pasarla a…?" (#19). */
interface Asking {
  press: Press
  card: Card
  areaId: string
}

/** Presses that start here are left to the control (e.g. an Item's box never starts a drag). */
const CONTROLS = 'button, input, textarea, select, a'
/** A click after a press that moved this far belongs to the gesture, not to a control. */
const CLICK_SLOP_PX = 6
/** The grain tile (see `paper-grain`); the grain layer is one tile larger than the screen. */
const GRAIN_TILE = 220
const HOLD_VIBRATION_MS = 12
/** A refused Card's or Area's slide back (0.35 s), plus a little slack. */
const RETURN_MS = 380
/** An accepted Card shrinking into the Jar (0.45 s), plus a little slack. */
const INTO_JAR_MS = 460

/** An Area Jar with nothing in it: one shared empty list, so it is not a new prop on every render. */
const NO_CARDS: readonly Card[] = []

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
    onJar: false,
    jarAreaId: null,
    card: null,
    area: null,
    panStart: { view: useDeskStore.getState().view, movement: [0, 0] },
  }
  // Labels and the Jars are buttons, but a press on them may still pan or move: checked before CONTROLS.
  // The resize handle needs no hold: it exists only to be dragged, so a swipe there is never a pan.
  const handle = target.closest<HTMLElement>('[data-area-resize]')
  if (handle) return { ...press, intent: 'resize', area: areaPress(handle) }
  const label = target.closest<HTMLElement>('[data-area-label]')
  if (label) return { ...press, intent: 'pending', labelAreaId: label.dataset.areaLabel!, area: areaPress(label) }
  const jar = target.closest<HTMLElement>('[data-jar]')
  if (jar) return { ...press, onJar: true, jarAreaId: jar.dataset.jar || null }
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

function areaPress(within: HTMLElement): NonNullable<Press['area']> {
  const wrapper = within.closest<HTMLElement>('[data-area-id]')!
  return { id: wrapper.dataset.areaId!, wrapper, cards: [], rect: null }
}

function findCard(id: string) {
  return useAppStore.getState().data.cards.find((card) => card.id === id)
}

function findArea(id: string) {
  return useAppStore.getState().data.areas.find((area) => area.id === id)
}

/** Picks the Card or the Area up. A Card gets the raised look; an Area only a stronger tint, and its Cards come along. */
function lift(press: Press) {
  if (press.area) {
    const { id, wrapper } = press.area
    if (press.intent === 'drag') {
      const { cards } = useAppStore.getState().data
      const ids = new Set(cards.filter((card) => card.areaId === id && card.jarredAt === null).map((card) => card.id))
      press.area.cards = [...document.querySelectorAll<HTMLElement>('[data-card-id]')].filter((element) => ids.has(element.dataset.cardId!))
    }
    wrapper.setAttribute('data-lifted', '')
    return
  }
  if (!press.card) return
  press.card.height = measureCardHeights().get(press.card.id) ?? FALLBACK_CARD_HEIGHT
  press.card.element.setAttribute('data-lifted', '')
}

/** The Jar a lifted Card's center is over: one rule for the highlight and the drop, so they always agree. */
function jarAt(point: Point): JarTarget | null {
  const { data, areaJars } = useAppStore.getState()
  return jarTarget(data.areas, point, { areaJars, far: useDeskStore.getState().view.s < FAR_SCALE })
}

/** The lifted Card's center in Desk coordinates, `offset` included: the point that picks its Area or the Jar. */
function liftedCenter(card: Card, lifted: NonNullable<Press['card']>): Point {
  return {
    x: card.position.x + lifted.offset.x + CARD_WIDTH / 2,
    y: card.position.y + lifted.offset.y + lifted.height / 2,
  }
}

/** Moves the lifted Card with the pointer and previews where it would go: an Area's color, or the Jar. */
function follow(press: Press, [mx, my]: [number, number]) {
  if (press.area) return followArea(press, [mx, my])
  const lifted = press.card
  const card = lifted && findCard(lifted.id)
  if (!lifted || !card) return
  const { s } = useDeskStore.getState().view
  lifted.offset = { x: mx / s, y: my / s }
  lifted.element.style.translate = `${lifted.offset.x}px ${lifted.offset.y}px`

  const center = liftedCenter(card, lifted)
  const target = jarAt(center)
  highlightJar(target)
  // Over the Desk Jar the Card shows no Area's color. Over an Area Jar it shows that Area's: a hint that it would change Area.
  const area = target?.areaId === null ? undefined : areaForPoint(useAppStore.getState().data.areas, center)
  if (area) lifted.element.style.setProperty('--b-preview', `var(--color-${area.color})`)
  else lifted.element.style.removeProperty('--b-preview')
}

/**
 * Moves the lifted Area and its Cards with the pointer (`translate`, as for a Card), or
 * resizes it (`--live-w` / `--live-h`), and warns while it would overlap another Area.
 */
function followArea(press: Press, [mx, my]: [number, number]) {
  const lifted = press.area!
  const area = findArea(lifted.id)
  if (!area) return
  const { s } = useDeskStore.getState().view
  // Whole Desk px, as the store will write them, so the overlap check sees the final rect.
  const dx = Math.round(mx / s)
  const dy = Math.round(my / s)
  if (press.intent === 'resize') {
    lifted.rect = resizedRect(area.rect, dx, dy)
    lifted.wrapper.style.setProperty('--live-w', `${lifted.rect.w}px`)
    lifted.wrapper.style.setProperty('--live-h', `${lifted.rect.h}px`)
  } else {
    lifted.rect = { ...area.rect, x: area.rect.x + dx, y: area.rect.y + dy }
    for (const element of [lifted.wrapper, ...lifted.cards]) element.style.translate = `${dx}px ${dy}px`
  }
  lifted.wrapper.toggleAttribute('data-blocked', overlapsAny(useAppStore.getState().data.areas, area.id, lifted.rect))
}

/** Clears everything the drag wrote to the DOM; React's styles show the stored place again. */
function settle(press: Press) {
  highlightJar(null)
  if (press.area) {
    const { wrapper, cards } = press.area
    for (const element of [wrapper, ...cards]) {
      element.removeAttribute('data-returning')
      element.style.translate = ''
    }
    wrapper.removeAttribute('data-lifted')
    wrapper.removeAttribute('data-blocked')
    wrapper.style.removeProperty('--live-w')
    wrapper.style.removeProperty('--live-h')
    return
  }
  const element = press.card?.element
  if (!element) return
  element.removeAttribute('data-lifted')
  element.removeAttribute('data-returning')
  element.removeAttribute('data-into-jar')
  element.style.translate = ''
  element.style.removeProperty('--b-preview')
}

function drop(press: Press, feedback: WinFeedback, onAsk: (asking: Asking) => void) {
  const lifted = press.card
  const card = lifted && findCard(lifted.id)
  if (!lifted || !card) return settle(press)
  const target = jarAt(liftedCenter(card, lifted))
  if (target) return dropOnJar(press, card, target, feedback, onAsk)
  useAppStore
    .getState()
    .dropCard(lifted.id, { x: card.position.x + lifted.offset.x, y: card.position.y + lifted.offset.y }, lifted.height)
  settle(press)
}

/**
 * A Card released over a Jar, decided by `jarVerdict` before anything moves. Refused:
 * it slides back, whichever Jar it was. Accepted by the Desk Jar or its own Area's: it
 * goes in. Accepted by another Area's Jar: `onAsk` first, and the Card waits lifted.
 */
function dropOnJar(press: Press, card: Card, target: JarTarget, feedback: WinFeedback, onAsk: (asking: Asking) => void) {
  highlightJar(null)
  const verdict = jarVerdict(card)
  if (!verdict.ok) {
    feedback.refused(verdict.pending)
    return slideBack(press)
  }
  if (target.areaId !== null && target.areaId !== card.areaId) return onAsk({ press, card, areaId: target.areaId })
  intoJar(press, card, target.areaId, feedback)
}

/** A Card that does not go in slides back to where the drag started, in its own Area; nothing is written. */
function slideBack(press: Press) {
  const { element } = press.card!
  element.removeAttribute('data-lifted')
  element.setAttribute('data-returning', '')
  element.style.translate = ''
  element.style.removeProperty('--b-preview')
  setTimeout(() => settle(press), prefersReducedMotion() ? 0 : RETURN_MS)
}

/**
 * An accepted Card shrinks into the Jar it was dropped on (an Area's, or the Desk's for
 * `areaId` null), and only then is the store written (React removes the Card). With
 * another Area's id, `jarCard` also moves it there. Under reduced motion CSS drops the
 * transitions and the outcome comes at once.
 */
function intoJar(press: Press, card: Card, areaId: string | null, feedback: WinFeedback) {
  const { element, height } = press.card!
  const { areas } = useAppStore.getState().data
  const area = areas.find((candidate) => candidate.id === areaId)
  const jar = area ? areaJarRect(area.rect) : jarRect(areas)
  if (!jar) return settle(press)
  const instant = prefersReducedMotion()
  element.removeAttribute('data-lifted')

  // From where the Card rests (its stored place) to the middle of the Jar.
  const toJar = {
    x: jar.x + jar.w / 2 - (card.position.x + CARD_WIDTH / 2),
    y: jar.y + jar.h / 2 - (card.position.y + height / 2),
  }
  element.setAttribute('data-into-jar', '')
  element.style.translate = `${toJar.x}px ${toJar.y}px`
  setTimeout(() => {
    const jarred = useAppStore.getState().jarCard(card.id, { areaId: area?.id }).ok
    settle(press)
    if (jarred) feedback.jarred(area?.id)
  }, instant ? 0 : INTO_JAR_MS)
}

/**
 * Ends an Area move or resize. Free: written once, like a Card drop. Over another Area:
 * the Area (and, for a move, its Cards) slides back, nothing is written, and `onBlocked`
 * says why. Under reduced motion CSS drops the transition and it is back at once.
 */
function dropArea(press: Press, onBlocked: () => void) {
  const lifted = press.area!
  const area = findArea(lifted.id)
  if (!area || !lifted.rect) return settle(press)
  if (!overlapsAny(useAppStore.getState().data.areas, area.id, lifted.rect)) {
    const { moveArea, resizeArea } = useAppStore.getState()
    if (press.intent === 'resize') resizeArea(area.id, lifted.rect)
    else moveArea(area.id, lifted.rect.x - area.rect.x, lifted.rect.y - area.rect.y)
    return settle(press)
  }

  const { wrapper, cards } = lifted
  wrapper.removeAttribute('data-lifted')
  wrapper.removeAttribute('data-blocked')
  for (const element of [wrapper, ...cards]) {
    element.setAttribute('data-returning', '')
    element.style.translate = ''
  }
  wrapper.style.removeProperty('--live-w')
  wrapper.style.removeProperty('--live-h')
  onBlocked()
  setTimeout(() => settle(press), prefersReducedMotion() ? 0 : RETURN_MS)
}

/** Stops a press for good, e.g. when a second finger starts a pinch: a lifted Card or Area goes back. */
function abandon(press: Press | null) {
  if (!press) return
  clearTimeout(press.timer)
  if (press.intent === 'drag' || press.intent === 'resize') settle(press)
  press.intent = 'ignore'
}

function flyToArea(area: Area) {
  useDeskStore.getState().flyTo(areaView(area, viewport()))
}

function editArea(area: Area) {
  useDeskStore.getState().openAreaEditor(area.id)
}

export function Desk() {
  const t = useT()
  const areas = useAppStore((state) => state.data.areas)
  const cards = useAppStore((state) => state.data.cards)
  const areaJars = useAppStore((state) => state.areaJars)
  const [asking, setAsking] = useState<Asking | null>(null)
  const deskRef = useRef<HTMLElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const grainRef = useRef<HTMLDivElement>(null)
  const press = useRef<Press | null>(null)
  const swallowClick = useRef(false)
  const feedback = useWinFeedback()

  const onDesk = useMemo(() => cards.filter((card) => card.jarredAt === null), [cards])
  const inJar = useMemo(() => cards.filter((card) => card.jarredAt !== null).sort((a, b) => a.jarredAt! - b.jarredAt!), [cards])
  const inJarByArea = useMemo(() => {
    const byArea = new Map<string, Card[]>()
    for (const card of inJar) {
      const list = byArea.get(card.areaId)
      if (list) list.push(card)
      else byArea.set(card.areaId, [card])
    }
    return byArea
  }, [inJar])
  const counts = useMemo(() => {
    const byArea = new Map<string, number>()
    for (const card of onDesk) byArea.set(card.areaId, (byArea.get(card.areaId) ?? 0) + 1)
    return byArea
  }, [onDesk])
  const colorOf = useMemo(() => {
    const colors = new Map<string, AreaColor>(areas.map((area) => [area.id, area.color]))
    return (areaId: string): AreaColor => colors.get(areaId) ?? areas[0]?.color ?? 'sage'
  }, [areas])
  const jar = useMemo(() => jarRect(areas), [areas])

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
          if (started.intent === 'resize') lift(started)
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
          if (current.intent === 'drag' || current.intent === 'resize') follow(current, movement)
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
          onJar: current.onJar,
        })
        if (outcome === 'drop' || outcome === 'resize') {
          if (cancelled) settle(current)
          else if (current.area) dropArea(current, () => useDeskStore.getState().showToast(t('areaInTheWay')))
          else drop(current, feedback, setAsking)
        } else if (outcome === 'open' && !cancelled && current.card) {
          useDeskStore.getState().openEditor(current.card.id)
        } else if (outcome === 'label' && !cancelled) {
          const area = useAppStore.getState().data.areas.find((candidate) => candidate.id === current.labelAreaId)
          if (area) flyToArea(area)
        } else if (outcome === 'jar' && !cancelled) {
          useDeskStore.getState().openWins(current.jarAreaId)
        }
      },

      onPinch: ({ first, origin: [ox, oy], offset: [s], memo }) => {
        // A second finger takes over: any pan, hold, Card drag or Area move or resize in progress stops.
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

  const askedArea = asking && areas.find((area) => area.id === asking.areaId)

  return (
    <>
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
          if ((event.target as Element).closest(`[data-card-id], [data-area-label], [data-area-resize], ${CONTROLS}`)) return
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
            <AreaRegion
              key={area.id}
              area={area}
              count={counts.get(area.id) ?? 0}
              onFly={flyToArea}
              onEdit={editArea}
              jarCards={areaJars ? (inJarByArea.get(area.id) ?? NO_CARDS) : undefined}
            />
          ))}
          {jar && <Jar rect={jar} cards={inJar} colorOf={colorOf} />}
          {onDesk.map((card) => (
            <DeskCard key={card.id} card={card} color={colorOf(card.areaId)} />
          ))}
        </div>
      </section>
      {/* Outside the section: React events from the sheet would otherwise bubble into the Desk's handlers (double-click creates a Card). */}
      {asking && askedArea && (
        <JarMoveSheet
          name={areaName(askedArea, t)}
          color={askedArea.color}
          onYes={() => {
            setAsking(null)
            intoJar(asking.press, asking.card, asking.areaId, feedback)
          }}
          onNo={() => {
            setAsking(null)
            slideBack(asking.press)
          }}
        />
      )}
    </>
  )
}
