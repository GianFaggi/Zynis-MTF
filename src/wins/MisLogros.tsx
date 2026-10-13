import { Check } from 'lucide-react'
import { useId, useMemo, type CSSProperties } from 'react'
import { Button } from '../components/ui/Button'
import { Segmented } from '../components/ui/Segmented'
import { Sheet } from '../components/ui/Sheet'
import { areaName } from '../desk/areas'
import { displayTitle } from '../desk/cardText'
import { useDeskStore } from '../desk/deskStore'
import { useT, type Translate } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Area, Card, Language } from '../types'
import { daysAgo } from './stats'
import { useWinStats } from './useWinStats'
import { WinsChart } from './WinsChart'

function relativeDay(time: number, now: number, t: Translate): string {
  const days = daysAgo(time, now)
  if (days <= 0) return t('today')
  if (days === 1) return t('yesterday')
  return t('daysAgo', days)
}

/** The filter's "Todas": no Area id is empty. */
const ALL = ''

/** "martes" / "Tuesday": built into the browser, so it works offline. */
function weekdayName(time: number, language: Language): string {
  return new Intl.DateTimeFormat(language, { weekday: 'long' }).format(time)
}

/**
 * The Mis logros sheet: the last 7 days (things done, broken down, a bar per day,
 * the best day) and every Card in the Jar, with "Devolver" to take it back out.
 * It only ever counts up; a quiet week gets a kind line, never a warning. While
 * "Frasco por área" is on (#19) it can show one Area: every number and the Jar list
 * then count that Area only, by each Card's current Area (`eventsOfArea`).
 */
export function MisLogros() {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const cards = useAppStore((state) => state.data.cards)
  const areas = useAppStore((state) => state.data.areas)
  const areaJars = useAppStore((state) => state.areaJars)
  const open = useDeskStore((state) => state.winsOpen)
  const closeWins = useDeskStore((state) => state.closeWins)
  const winsAreaId = useDeskStore((state) => state.winsAreaId)
  // No filter with the option off; an Area gone since (deleted, or an Import) reads as "Todas".
  const areaId = areaJars && areas.some((area) => area.id === winsAreaId) ? winsAreaId : null
  const { days, week, best, total, now } = useWinStats(areaId)
  const inJarId = useId()

  const inJar = useMemo(
    () =>
      cards
        .filter((card) => card.jarredAt !== null && (areaId === null || card.areaId === areaId))
        .sort((a, b) => b.jarredAt! - a.jarredAt!),
    [cards, areaId],
  )
  const bestLine = best ? `${t('bestDay', weekdayName(best.start, language), best.count)} ${t('quietDays')}` : t('quietDays')

  return (
    <Sheet open={open} onClose={closeWins} title={t('wins')} closeLabel={t('close')} wide>
      {areaJars && (
        <Segmented
          label={t('area')}
          options={[
            { value: ALL, label: t('allAreas') },
            ...areas.map((area) => ({ value: area.id, label: areaName(area, t), dot: area.color })),
          ]}
          value={areaId ?? ALL}
          onChange={(value) => useDeskStore.getState().setWinsArea(value === ALL ? null : value)}
        />
      )}
      <div className="grid gap-[18px] min-[760px]:grid-cols-[1.15fr_1fr] min-[760px]:items-start">
        <section className="flex flex-col gap-4 rounded-2xl bg-paper p-[18px]">
          <p className="flex flex-wrap items-baseline gap-3">
            <b className="font-display text-[60px] leading-none font-semibold tracking-[-0.02em] text-accent-ink tabular-nums">{week.done}</b>
            <span className="max-w-[22ch] text-base text-ink-2">{t('thingsDone', week.done)}</span>
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat value={week.items} label={t('itemsChecked')} />
            <Stat value={week.cards} label={t('cardsFinished')} />
            <Stat value={week.notes} label={t('notesWritten')} quiet />
          </div>
          <WinsChart days={days} />
          <p className="text-[14.5px] text-ink-2">{bestLine}</p>
          <p className="text-[14.5px] text-pencil">{t('sinceStart', total)}</p>
        </section>

        <section aria-labelledby={inJarId} className="flex flex-col gap-4 rounded-2xl bg-paper p-[18px]">
          <h3 id={inJarId} className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">
            {t('inJar')}
          </h3>
          {inJar.length > 0 ? (
            <ul className="flex flex-col">
              {inJar.map((card) => (
                <JarredCard key={card.id} card={card} area={areas.find((area) => area.id === card.areaId)} now={now} />
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-pencil">{t('emptyJar')}</p>
          )}
        </section>
      </div>
    </Sheet>
  )
}

function Stat({ value, label, quiet }: { value: number; label: string; quiet?: boolean }) {
  return (
    <p className="flex flex-col gap-0.5 border-t border-rule pt-2.5">
      <b className={`font-display text-[22px] leading-[1.1] tabular-nums ${quiet ? 'font-normal text-pencil' : 'font-semibold'}`}>{value}</b>
      <span className="text-[12.5px] leading-[1.3] text-pencil">{label}</span>
    </p>
  )
}

function JarredCard({ card, area, now }: { card: Card; area: Area | undefined; now: number }) {
  const t = useT()
  const when = relativeDay(card.jarredAt!, now, t)

  return (
    <li
      style={area ? ({ '--b': `var(--color-${area.color})` } as CSSProperties) : undefined}
      className="flex items-center gap-3 border-t border-rule py-2.5 first:border-t-0 first:pt-0"
    >
      <span aria-hidden="true" className="grid size-6 flex-none place-items-center rounded-full bg-accent-soft text-accent-ink">
        <Check size={13} strokeWidth={3} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="font-semibold [overflow-wrap:anywhere]">{displayTitle(card) || t('card')}</b>
        <span className="flex items-center gap-1.5 text-[12.5px] text-pencil">
          {area && <i aria-hidden="true" className="size-[7px] rounded-full bg-(--b)" />}
          {area ? `${areaName(area, t)} · ${when}` : when}
        </span>
      </span>
      <Button
        onClick={() => {
          useAppStore.getState().returnCard(card.id)
          useDeskStore.getState().showToast(t('returned'))
        }}
      >
        {t('takeOut')}
      </Button>
    </li>
  )
}
