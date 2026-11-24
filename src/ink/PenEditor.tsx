import { useEffect, useEffectEvent, useId, useRef } from 'react'
import { Button } from '../components/ui/Button'
import { Segmented } from '../components/ui/Segmented'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { INK_SIZE_SLIDER } from './constants'
import { PEN_WIDTHS, penName, penWidth, type PenWidth } from './pens'

type PenEditorProps = {
  onClose: () => void
}

/**
 * The chosen pen's editor (#51, design D6): a small panel above the tray with the pen's color
 * (the browser's own `<input type="color">`, any color; not for Tinta, which follows the theme)
 * and its width: a preset, or any step between them on a slider. Changes apply at once, through `editPen`. It closes on "Listo", on Esc (caught
 * before the Card editor's Sheet sees it), and on a press anywhere outside it but the tray.
 */
export function PenEditor({ onClose }: PenEditorProps) {
  const t = useT()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const index = useAppStore((state) => state.pens.chosen)
  const pen = useAppStore((state) => state.pens.pens[state.pens.chosen])
  const close = useEffectEvent(onClose)

  useEffect(() => {
    const panel = panelRef.current!
    const previouslyFocused = document.activeElement as HTMLElement | null
    panel.focus({ preventScroll: true })

    // Window, capture phase: runs before the Sheet's document listener, so Esc closes only this panel.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      close()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      // The tray handles its own taps: the chosen pen keeps this open, another pen closes it.
      if (panel.contains(target) || target?.closest('[data-pen-tray]')) return
      close()
    }
    window.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      // Focus was in the panel (now gone, so on the body): back to the pen that opened it.
      // A press on another control already moved focus there, and keeps it.
      const active = document.activeElement
      if (active === document.body || panel.contains(active)) previouslyFocused?.focus({ preventScroll: true })
    }
  }, [])

  const edit = useAppStore.getState().editPen
  const width = penWidth(pen.size)

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="absolute bottom-[calc(100%+10px)] left-0 z-10 flex w-[min(320px,100%)] flex-col gap-3 rounded-2xl bg-sheet p-3.5 text-ink shadow-lift outline-none"
    >
      <h3 id={titleId} className="text-[15px] font-semibold">
        {t('penEdit', penName(t, index))}
      </h3>
      {pen.color !== null && (
        <label className="flex items-center gap-2.5 text-[13px] text-pencil">
          <input
            type="color"
            value={pen.color}
            onChange={(event) => edit(index, { color: event.target.value.toLowerCase() })}
            className="h-10 w-13 cursor-pointer rounded-[10px] border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-[10px] [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-rule [&::-webkit-color-swatch-wrapper]:p-0"
          />
          {t('penColor')}
        </label>
      )}
      <div className="flex flex-col gap-1.5">
        <span aria-hidden="true" className="flex justify-between text-[13px] text-pencil">
          {t('penWidth')}
          <span data-pen-size="" className="tabular-nums">
            {pen.size}
          </span>
        </span>
        <Segmented<PenWidth>
          label={t('penWidth')}
          options={PEN_WIDTHS.map((preset) => ({ value: preset.width, label: t(preset.label) }))}
          // A step between presets matches none: none shows as pressed until one is picked.
          value={width as PenWidth}
          onChange={(value) => edit(index, { size: PEN_WIDTHS.find((preset) => preset.width === value)!.size })}
        />
        {/* Steps between the presets (design D2). Ink, never the accent: this is MTF's own UI. */}
        <input
          type="range"
          aria-label={t('penWidthExact')}
          min={INK_SIZE_SLIDER.min}
          max={INK_SIZE_SLIDER.max}
          step={INK_SIZE_SLIDER.step}
          value={pen.size}
          onChange={(event) => edit(index, { size: Number(event.target.value) })}
          className="h-8 w-full cursor-pointer slider-ink"
        />
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          {t('penDone')}
        </Button>
      </div>
    </div>
  )
}
