import { useT } from '../i18n'
import type { DayCount } from './stats'

// The mockup's chart geometry (design/mtf-mockup-desk.html), in SVG units.
const W = 336
const H = 176
const TOP = 22
const BOTTOM = 26
const PLOT = H - TOP - BOTTOM
const STEP = W / 7
const BAR = 26
/** The tallest bar stands for at least this many, so one Win does not fill the chart. */
const MIN_SCALE = 4
const MIN_BAR = 4

type WinsChartProps = {
  /** The last 7 days, oldest first; the last one is today. */
  days: readonly DayCount[]
}

/** One bar per day; today's in the accent. A day with nothing done has no bar and no number. */
export function WinsChart({ days }: WinsChartProps) {
  const t = useT()
  const max = Math.max(MIN_SCALE, ...days.map((day) => day.count))
  const label = 'font-ui text-[11px] font-medium tabular-nums'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('chartLabel')} className="h-auto w-full max-w-[520px]">
      <line x1="0" x2={W} y1={TOP + PLOT} y2={TOP + PLOT} className="stroke-rule" />
      {days.map((day, i) => {
        const today = i === days.length - 1
        const x = STEP * i + (STEP - BAR) / 2
        const height = day.count ? Math.max(MIN_BAR, (day.count / max) * PLOT) : 0
        const y = TOP + PLOT - height
        return (
          <g key={day.start}>
            {day.count > 0 && (
              <>
                <rect x={x} y={y} width={BAR} height={height} rx="5" className={today ? 'fill-accent' : 'fill-bar'} />
                <text x={x + BAR / 2} y={y - 6} textAnchor="middle" className={`${label} fill-ink-2 font-semibold`}>
                  {day.count}
                </text>
              </>
            )}
            <text x={x + BAR / 2} y={H - 6} textAnchor="middle" className={`${label} ${today ? 'fill-accent-ink font-bold' : 'fill-pencil'}`}>
              {t('weekdayInitial', new Date(day.start).getDay())}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
