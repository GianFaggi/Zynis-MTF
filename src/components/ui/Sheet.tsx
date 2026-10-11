import { X } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import type { AreaColor } from '../../types'
import { IconButton } from './IconButton'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  /** Accessible name of the close button, in the current language. */
  closeLabel: string
  /** Mixes an Area color into the panel, like the Card it edits. */
  tint?: AreaColor
  /** Header controls shown before the close button. */
  actions?: ReactNode
  /** Keeps the title for screen readers only; the dialog is still named by it. */
  hideTitle?: boolean
  children: ReactNode
}

/**
 * A modal panel over a scrim: bottom sheet on phones, centered card from 720px.
 * A `div role="dialog"` rather than `<dialog>`, because jsdom has no `showModal()`.
 * Closes on Esc, the close button and a click/tap on the scrim; focus moves into
 * the sheet on open and back to whatever had it (the trigger) on close.
 */
export function Sheet({ open, onClose, title, closeLabel, tint, actions, hideTitle, children }: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const pressStartedOnScrim = useRef(false)
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-scrim pt-[calc(24px+env(safe-area-inset-top,0px))] min-[720px]:items-center min-[720px]:p-10"
      // Only a press that both starts and ends on the scrim closes the sheet, so
      // selecting text inside the sheet and releasing outside does not close it.
      onPointerDown={(event) => {
        pressStartedOnScrim.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressStartedOnScrim.current && event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={tint ? ({ '--b': `var(--color-${tint})` } as CSSProperties) : undefined}
        className={`flex max-h-full w-[min(600px,100%)] animate-rise flex-col gap-2.5 overflow-y-auto rounded-t-[20px] px-5 pt-3.5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] text-ink outline-none min-[720px]:max-h-[88vh] min-[720px]:rounded-[18px] min-[720px]:pb-[18px] ${tint ? 'card-tint' : 'bg-sheet'}`}
      >
        <div className="-mx-2 flex items-center justify-between gap-2">
          <h2
            id={titleId}
            className={hideTitle ? 'sr-only' : 'pl-2 font-display text-[23px] leading-tight font-semibold'}
          >
            {title}
          </h2>
          <div className="ml-auto flex items-center gap-1">
            {actions}
            <IconButton label={closeLabel} icon={X} onClick={onClose} />
          </div>
        </div>
        {children}
      </section>
    </div>
  )
}
