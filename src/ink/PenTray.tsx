import { Pencil } from 'lucide-react'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { PEN_INDEXES, penName, widthLabel, type PenIndex } from './pens'

type PenTrayProps = {
  /** While the eraser is on, no pen shows as chosen. */
  eraser: boolean
  /** A pen was chosen (or the chosen one tapped while erasing): the box goes back to writing. */
  onChoose: () => void
  /** The chosen pen was tapped again: open its editor. */
  onEdit: () => void
}

/**
 * The four pens of the handwriting box (#51, design D6): a round button each, with a dot in the
 * pen's color sized by its width. The chosen one has an ink ring and a pencil badge, the hint
 * that a second tap edits it. Ink and paper only: the user's colors appear only as the dots.
 */
export function PenTray({ eraser, onChoose, onEdit }: PenTrayProps) {
  const t = useT()
  const pens = useAppStore((state) => state.pens)

  const tap = (index: PenIndex) => {
    if (index === pens.chosen && !eraser) return onEdit()
    useAppStore.getState().choosePen(index)
    onChoose()
  }

  return (
    <div role="group" aria-label={t('pens')} data-pen-tray="" className="inline-flex items-center gap-1.5 rounded-full bg-hover p-1">
      {PEN_INDEXES.map((index) => {
        const { color, size } = pens.pens[index]
        const chosen = index === pens.chosen && !eraser
        const dot = 8 + Math.round(size * 1.3)
        return (
          <button
            key={index}
            type="button"
            aria-pressed={chosen}
            aria-label={t('penButton', penName(t, index), widthLabel(t, size))}
            onClick={() => tap(index)}
            className="relative grid size-10 cursor-pointer place-items-center rounded-full bg-sheet text-ink shadow-[inset_0_0_0_1px_var(--color-rule)] aria-pressed:shadow-[inset_0_0_0_2px_var(--color-ink),0_0_0_2px_var(--color-sheet),0_0_0_4px_var(--color-ink)]"
          >
            <span
              aria-hidden="true"
              data-pen-dot=""
              className="rounded-full bg-current"
              style={{ width: dot, height: dot, backgroundColor: color ?? undefined }}
            />
            {chosen && (
              <span aria-hidden="true" data-pen-badge="" className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full bg-ink text-paper">
                <Pencil size={10} strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
