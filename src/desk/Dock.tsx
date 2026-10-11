import { LayoutGrid, Scan, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { JarIcon } from '../wins/JarIcon'
import { jarBounds, jarRect } from '../wins/jarLayout'
import { areaName } from './areas'
import { useDeskStore } from './deskStore'
import { measureCardHeights, viewport } from './dom'
import { areaView, deskBounds, fitRect } from './geometry'

/** The Jar and its caption with paper around it, at no more than 100%. */
function goToJar() {
  const jar = jarRect(useAppStore.getState().data.areas)
  if (!jar) return
  const { x, y, w, h } = jarBounds(jar)
  useDeskStore.getState().flyTo(fitRect({ x: x - 200, y: y - 60, w: w + 400, h: h + 120 }, viewport(), { maxScale: 1 }))
}

function seeAll() {
  const { areas, cards } = useAppStore.getState().data
  const bounds = deskBounds(areas, cards, measureCardHeights())
  if (bounds) useDeskStore.getState().flyTo(fitRect(bounds, viewport()))
}

function tidyUp() {
  // The transition goes on before the positions change, so the Cards glide there.
  useDeskStore.getState().animateTidy()
  useAppStore.getState().tidyUp(measureCardHeights())
}

function DockButton({ onClick, children, style }: { onClick: () => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="flex h-[38px] flex-none cursor-pointer items-center gap-[7px] rounded-full px-3 font-medium whitespace-nowrap text-ink-2 hover:bg-hover hover:text-ink"
    >
      {children}
    </button>
  )
}

function ToolButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <DockButton onClick={onClick}>
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      {label}
    </DockButton>
  )
}

/** The bottom Dock: fly to each stored Area, the Jar, See all, Tidy up. Scrolls sideways when narrow. */
export function Dock() {
  const t = useT()
  const areas = useAppStore((state) => state.data.areas)

  return (
    <div className="pointer-events-none fixed right-[84px] bottom-[calc(18px+env(safe-area-inset-bottom,0px))] left-3.5 z-10 flex justify-center max-[520px]:right-[82px] max-[520px]:left-2.5 max-[520px]:justify-start">
      <nav
        aria-label={t('areas')}
        className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-float p-[5px] shadow-paper backdrop-blur-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {areas.map((area) => (
          <DockButton
            key={area.id}
            onClick={() => useDeskStore.getState().flyTo(areaView(area, viewport()))}
            style={{ '--b': `var(--color-${area.color})` } as CSSProperties}
          >
            <i aria-hidden="true" className="size-2 rounded-full bg-(--b)" />
            {areaName(area, t)}
          </DockButton>
        ))}
        <span aria-hidden="true" className="mx-1 h-[22px] w-px flex-none bg-rule" />
        <ToolButton icon={JarIcon} label={t('jar')} onClick={goToJar} />
        <ToolButton icon={Scan} label={t('seeAll')} onClick={seeAll} />
        <ToolButton icon={LayoutGrid} label={t('tidyUp')} onClick={tidyUp} />
      </nav>
    </div>
  )
}
