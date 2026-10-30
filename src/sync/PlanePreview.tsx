import { Ellipsis, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Segmented } from '../components/ui/Segmented'
import { languageNames, useT } from '../i18n'
import { applyTheme } from '../lib/theme'
import { useAppStore } from '../store/appStore'
import type { Theme } from '../types'
import { PlaneWait } from './PlaneWait'
import { SyncIndicator } from './SyncIndicator'

// A dev-only page (`npm run dev`, then `/?avion`, see main.tsx) to watch the wait
// before the backend exists. Vite drops it from the production build, so its texts
// are not translated.

/** How long each simulated server takes to answer (ms); `null` never answers. */
const SERVERS = [
  { label: 'Despierto (0,8 s)', answersIn: 800 },
  { label: 'Dormido (40 s)', answersIn: 40_000 },
  { label: 'No contesta', answersIn: null },
] as const

const languageOptions = (['es', 'en'] as const).map((value) => ({ value, label: languageNames[value] }))

export function PlanePreview() {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  // Each try remounts the wait and the indicator, which restarts their timelines.
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const answer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'system', label: t('themeSystem') },
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
  ]

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => () => clearTimeout(answer.current), [])

  function ask(answersIn: number | null) {
    clearTimeout(answer.current)
    setAttempt((n) => n + 1)
    setPending(true)
    if (answersIn !== null) answer.current = setTimeout(() => setPending(false), answersIn)
  }

  return (
    <main className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-5 pt-[calc(28px+env(safe-area-inset-top,0px))] pb-[calc(40px+env(safe-area-inset-bottom,0px))]">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] leading-tight font-semibold italic">Avión de papel</h1>
          <p className="text-sm text-pencil">Vista previa de desarrollo. Simulá un servidor:</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {SERVERS.map((server) => (
            <Button key={server.label} onClick={() => ask(server.answersIn)}>
              {server.label}
            </Button>
          ))}
        </div>

        {/* A sheet like the sign-in sheet (#36) will be. */}
        <section className="w-full max-w-[440px] rounded-[22px] bg-sheet px-[22px] pt-5 pb-[22px] shadow-paper">
          <h2 className="mb-3.5 font-display text-xl font-semibold">Entrar</h2>
          {pending ? (
            <PlaneWait key={attempt} />
          ) : (
            <p className="py-5 text-center font-display text-lg font-semibold">{attempt > 0 ? '¡Listo!' : '—'}</p>
          )}
        </section>

        {/* A copy of the tools pill, where #37 will mount the indicator. */}
        <div className="flex w-fit items-center gap-1 rounded-full bg-float p-1 shadow-paper backdrop-blur-[10px]">
          <IconButton label={t('search')} icon={Search} />
          <IconButton label={t('settings')} icon={Ellipsis} />
          {pending && <SyncIndicator key={attempt} />}
        </div>

        <div className="flex flex-col gap-2">
          <Segmented label={t('language')} options={languageOptions} value={language} onChange={setLanguage} />
          <Segmented label={t('theme')} options={themeOptions} value={theme} onChange={setTheme} />
        </div>
      </div>
    </main>
  )
}
