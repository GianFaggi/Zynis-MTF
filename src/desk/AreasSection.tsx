import { Pencil, Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Button } from '../components/ui/Button'
import { Segmented } from '../components/ui/Segmented'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Area } from '../types'
import { canRestore, gridArrangement, isRecoverable, rowArrangement, savedArrangement, starArrangement, type Arrangement } from './arrange'
import { areaName } from './areas'
import { useDeskStore } from './deskStore'

type AreasSectionProps = {
  /** An Area's row was chosen: Settings closes and that Area's editor opens. */
  onOpenArea: (id: string) => void
  /** "Nueva área" created this Area: Settings closes, the view flies to it and its editor opens as new. */
  onCreated: (id: string) => void
  /** An arrangement was chosen, and confirmed when needed: Settings closes and the Areas move to `targets`. */
  onArranged: (targets: Arrangement) => void
}

/**
 * The Areas group of the Settings sheet: every Area in Desk order, each opening its
 * editor, "Nueva área", "Acomodar áreas" and "Frasco por área" (#19). Arranging when
 * the current arrangement could not be chosen again first asks, in place, like "Borrar
 * área"; the question is local state, so it is gone when Settings closes.
 */
export function AreasSection({ onOpenArea, onCreated, onArranged }: AreasSectionProps) {
  const t = useT()
  const areas = useAppStore((state) => state.data.areas)
  const saved = useAppStore((state) => state.arrangement)
  const areaJars = useAppStore((state) => state.areaJars)
  const [asking, setAsking] = useState<Arrangement | null>(null)

  const arrange = (layout: (current: readonly Area[]) => Arrangement) => {
    const targets = layout(areas)
    if (isRecoverable(areas, saved)) onArranged(targets)
    else setAsking(targets)
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('areas')}</span>
      <ul className="-mx-2 flex flex-col">
        {areas.map((area) => (
          <li key={area.id}>
            <button
              type="button"
              onClick={() => onOpenArea(area.id)}
              style={{ '--b': `var(--color-${area.color})` } as CSSProperties}
              className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2 text-left text-[15px] text-ink hover:bg-hover"
            >
              <i aria-hidden="true" className="size-2.5 flex-none rounded-full bg-(--b)" />
              <span className="min-w-0 flex-1 truncate">{areaName(area, t)}</span>
              <Pencil size={15} strokeWidth={1.75} aria-hidden="true" className="flex-none text-pencil" />
            </button>
          </li>
        ))}
      </ul>
      <div>
        <Button onClick={() => onCreated(useAppStore.getState().createArea(t('newAreaName')))}>
          <Plus size={15} strokeWidth={2} aria-hidden="true" />
          {t('newArea')}
        </Button>
      </div>

      <div role="group" aria-label={t('arrangeAreas')} className="mt-2 flex flex-col gap-2">
        <span aria-hidden="true" className="text-[13px] font-semibold text-pencil">
          {t('arrangeAreas')}
        </span>
        {!asking ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => arrange(rowArrangement)}>{t('arrangeRow')}</Button>
              <Button onClick={() => arrange(gridArrangement)}>{t('arrangeGrid')}</Button>
              <Button onClick={() => arrange(starArrangement)}>{t('arrangeStar')}</Button>
              <Button
                disabled={!canRestore(areas, saved)}
                onClick={() => {
                  if (canRestore(areas, saved)) arrange((current) => savedArrangement(current, saved.rects))
                }}
              >
                {t('arrangeMine')}
              </Button>
            </div>
            <div>
              <Button
                onClick={() => {
                  useAppStore.getState().saveArrangement()
                  useDeskStore.getState().showToast(t('arrangementSaved'))
                }}
              >
                {t('saveArrangement')}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm">{t('arrangeAsk')}</p>
            <Button onClick={() => setAsking(null)}>{t('cancel')}</Button>
            <Button
              variant="primary"
              onClick={() => {
                setAsking(null)
                onArranged(asking)
              }}
            >
              {t('arrange')}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <span aria-hidden="true" className="text-[13px] font-semibold text-pencil">
          {t('areaJarsOption')}
        </span>
        <Segmented
          label={t('areaJarsOption')}
          options={[
            { value: 'no', label: t('no') },
            { value: 'yes', label: t('yes') },
          ]}
          value={areaJars ? 'yes' : 'no'}
          onChange={(value) => useAppStore.getState().setAreaJars(value === 'yes')}
        />
      </div>
    </div>
  )
}
