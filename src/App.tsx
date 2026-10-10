import { Ellipsis } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconButton } from './components/ui/IconButton'
import { Segmented } from './components/ui/Segmented'
import { Sheet } from './components/ui/Sheet'
import { languageNames, useT } from './i18n'
import { useAppStore } from './store/appStore'

const languageOptions = (['es', 'en'] as const).map((value) => ({ value, label: languageNames[value] }))

/** The base paper screen (change 1). The Desk is added on top of it in change 2. */
export default function App() {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <main className="relative h-full overflow-hidden bg-paper">
      <div className="pointer-events-none fixed top-[calc(16px+env(safe-area-inset-top,0px))] left-[calc(18px+env(safe-area-inset-left,0px))] z-10 flex items-baseline gap-2.5">
        <h1 className="font-display text-[28px] leading-none font-semibold tracking-[-0.01em] italic">mtf</h1>
        <p className="hidden text-[12.5px] text-pencil min-[521px]:block">{t('tagline')}</p>
      </div>

      <div className="fixed top-[calc(12px+env(safe-area-inset-top,0px))] right-[calc(14px+env(safe-area-inset-right,0px))] z-10 flex items-center gap-1 rounded-full bg-float p-1 shadow-paper backdrop-blur-[10px]">
        <IconButton label={t('settings')} icon={Ellipsis} onClick={() => setSettingsOpen(true)} />
      </div>

      <div className="grid h-full place-items-center px-6 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        <p className="max-w-[28ch] text-center font-display text-2xl leading-snug font-medium text-ink-2 italic">
          {t('welcome')}
        </p>
      </div>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('settings')} closeLabel={t('close')}>
        <div className="flex flex-col gap-2 py-2">
          <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('language')}</span>
          <Segmented label={t('language')} options={languageOptions} value={language} onChange={setLanguage} />
        </div>
      </Sheet>
    </main>
  )
}
