import { Pencil, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Button } from '../components/ui/Button'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { areaName } from './areas'

type AreasSectionProps = {
  /** An Area's row was chosen: Settings closes and that Area's editor opens. */
  onOpenArea: (id: string) => void
  /** "Nueva área" created this Area: Settings closes, the view flies to it and its editor opens as new. */
  onCreated: (id: string) => void
}

/** The Areas group of the Settings sheet: every Area in Desk order, each opening its editor, and "Nueva área". */
export function AreasSection({ onOpenArea, onCreated }: AreasSectionProps) {
  const t = useT()
  const areas = useAppStore((state) => state.data.areas)

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
    </div>
  )
}
