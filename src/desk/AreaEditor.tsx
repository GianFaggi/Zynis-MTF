import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Area } from '../types'
import { AREA_COLORS, AREA_NAME_MAX, areaName, nearestArea } from './areas'
import { useDeskStore } from './deskStore'

const sectionLabel = 'text-xs font-semibold tracking-[0.08em] text-pencil uppercase'

/**
 * The Area editor sheet (KB/frontend/desk.md#areas): name, color and delete for one
 * Area. Opened from the edit button next to an Area's label or from Settings. Like
 * the Card editor, every change is saved as it happens; the Sheet is keyed by Area,
 * so a draft or a delete confirmation never carries over to another Area.
 */
export function AreaEditor() {
  const editor = useDeskStore((state) => state.areaEditor)
  const area = useAppStore((state) => state.data.areas.find((candidate) => candidate.id === editor?.id))
  if (!editor || !area) return null
  return <AreaSheet key={area.id} area={area} isNew={editor.isNew} />
}

function AreaSheet({ area, isNew }: { area: Area; isNew: boolean }) {
  const t = useT()
  const areas = useAppStore((state) => state.data.areas)
  const cardCount = useAppStore((state) => state.data.cards.filter((card) => card.areaId === area.id).length)
  const { renameArea, recolorArea, deleteArea } = useAppStore.getState()
  const [draft, setDraft] = useState(() => areaName(area, t))
  // What a custom Area goes back to when its name is left empty. Each keystroke is saved
  // so the label updates live, so the stored name may already be a half-erased one.
  const [openedName] = useState(draft)
  const [confirming, setConfirming] = useState(false)
  const others = areas.filter((candidate) => candidate.id !== area.id)
  const nearest = nearestArea(areas, area)
  const [destinationId, setDestinationId] = useState(nearest?.id ?? '')
  const nameRef = useRef<HTMLInputElement>(null)

  // Effects run children first: this one runs after the Sheet has moved focus into its
  // panel, so a new Area's name can take it, selected, and typing replaces it.
  useEffect(() => {
    if (!isNew) return
    nameRef.current?.focus()
    nameRef.current?.select()
  }, [isNew])

  const close = () => {
    if (!draft.trim()) renameArea(area.id, area.key ? '' : openedName)
    useDeskStore.getState().closeAreaEditor()
  }

  const confirmDelete = () => {
    const destination = areas.find((candidate) => candidate.id === destinationId)
    if (!destination) return
    deleteArea(area.id, destination.id)
    const { closeAreaEditor, showToast } = useDeskStore.getState()
    closeAreaEditor()
    showToast(t('areaDeleted'), cardCount > 0 ? t('areaDeletedDetail', cardCount, areaName(destination, t)) : undefined)
  }

  // The nearest Area first, so it is both offered first and chosen by default.
  const destinations = nearest ? [nearest, ...others.filter((candidate) => candidate.id !== nearest.id)] : others

  return (
    <Sheet open onClose={close} title={t('area')} hideTitle closeLabel={t('close')} tint={area.color}>
      {/* A form, as for the Card editor's Items: phone keyboards always submit it with their confirm key. */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          nameRef.current?.blur()
        }}
      >
        <label className="flex flex-col gap-1">
          <span className={sectionLabel}>{t('areaName')}</span>
          <input
            ref={nameRef}
            value={draft}
            maxLength={AREA_NAME_MAX}
            onChange={(event) => {
              setDraft(event.target.value)
              if (event.target.value.trim()) renameArea(area.id, event.target.value)
            }}
            autoComplete="off"
            enterKeyHint="done"
            className="w-full border-b border-transparent bg-transparent py-0.5 font-display text-[23px] leading-[1.25] font-semibold outline-none focus-visible:border-rule"
          />
        </label>
      </form>

      <div className="flex flex-col gap-2 py-1">
        <span className={sectionLabel}>{t('areaColor')}</span>
        <div role="radiogroup" aria-label={t('areaColor')} className="flex flex-wrap gap-2.5">
          {AREA_COLORS.map((color) => (
            <label
              key={color}
              style={{ '--b': `var(--color-${color})` } as CSSProperties}
              className="grid size-9 cursor-pointer place-items-center rounded-full has-checked:shadow-[0_0_0_2px_var(--color-sheet),0_0_0_4px_var(--color-ink)] has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-ink"
            >
              <input
                type="radio"
                name={`area-color-${area.id}`}
                value={color}
                checked={area.color === color}
                onChange={() => recolorArea(area.id, color)}
                aria-label={t('colorName', color)}
                className="sr-only"
              />
              <span aria-hidden="true" className="size-full rounded-full bg-(--b)" />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex flex-col gap-2.5 border-t border-rule pt-3">
        {!confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="danger" disabled={others.length === 0} onClick={() => setConfirming(true)}>
              {t('deleteArea')}
            </Button>
            {others.length === 0 && <p className="text-[13px] text-pencil">{t('lastArea')}</p>}
            <span className="ml-auto">
              <Button variant="primary" onClick={close}>
                {t('save')}
              </Button>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {cardCount > 0 ? (
              <label className="mr-auto flex flex-wrap items-center gap-2 text-sm">
                {t('deleteAreaCards', cardCount)}
                <select
                  value={destinationId}
                  onChange={(event) => setDestinationId(event.target.value)}
                  className="h-9 cursor-pointer rounded-[10px] border border-rule bg-sheet px-2.5 text-sm text-ink"
                >
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {areaName(destination, t)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mr-auto text-sm">{t('deleteAreaAsk')}</p>
            )}
            <Button onClick={() => setConfirming(false)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('delete')}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
