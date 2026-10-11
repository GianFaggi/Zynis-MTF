import { Star } from 'lucide-react'
import { useDeskStore } from '../desk/deskStore'
import { useT } from '../i18n'
import { useWinStats } from './useWinStats'

/**
 * Things done in the last 7 days, always in the tools pill; opens Mis logros. Lives
 * here, not in the UI kit, because it uses the accent. Each new Win remounts the
 * inner span (keyed by `winsBump`), which replays the bump keyframe with no timers;
 * the button itself stays mounted, so it never loses focus.
 */
export function WinsCounter() {
  const t = useT()
  const done = useWinStats().week.done
  const bump = useDeskStore((state) => state.winsBump)
  const openWins = useDeskStore((state) => state.openWins)

  return (
    <button
      type="button"
      aria-label={t('winsCounter', done)}
      title={t('wins')}
      onClick={openWins}
      className="flex h-[38px] flex-none cursor-pointer items-center rounded-full bg-accent-soft pr-[13px] pl-2.5 font-bold text-accent-ink tabular-nums"
    >
      <span key={bump} className={`flex items-center gap-1.5 ${bump > 0 ? 'animate-bump' : ''}`}>
        <Star size={17} strokeWidth={1.75} aria-hidden="true" className="fill-current" />
        {done}
      </span>
    </button>
  )
}
