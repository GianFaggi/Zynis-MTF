import { Ellipsis, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BackupSection } from './backup/BackupSection'
import { IconButton } from './components/ui/IconButton'
import { Segmented } from './components/ui/Segmented'
import { Sheet } from './components/ui/Sheet'
import { Toast } from './components/ui/Toast'
import { AreaEditor } from './desk/AreaEditor'
import type { Arrangement } from './desk/arrange'
import { AreasSection } from './desk/AreasSection'
import { CardEditor } from './desk/CardEditor'
import { Desk } from './desk/Desk'
import { Dock } from './desk/Dock'
import { useDeskStore } from './desk/deskStore'
import { viewport } from './desk/dom'
import { SearchBox } from './desk/SearchBox'
import { areaView, toWorld } from './desk/geometry'
import { showWholeDesk, welcomeCardView } from './desk/view'
import { languageNames, useT } from './i18n'
import { InstallNudge } from './install/InstallNudge'
import { InstallSection } from './install/InstallSection'
import { applyTheme } from './lib/theme'
import { useAppStore } from './store/appStore'
import { usePersistentStorage } from './store/usePersistentStorage'
import type { Theme } from './types'
import { placeWelcome } from './welcome/welcome'
import { WelcomeSection } from './welcome/WelcomeSection'
import { MisLogros } from './wins/MisLogros'
import { WinsCounter } from './wins/WinsCounter'

const languageOptions = (['es', 'en'] as const).map((value) => ({ value, label: languageNames[value] }))

/** A new Card in the middle of the view, opened in the editor. */
function createCardInView() {
  const { w, h } = viewport()
  const id = useAppStore.getState().createCard(toWorld(useDeskStore.getState().view, { x: w / 2, y: h / 2 }))
  if (id) useDeskStore.getState().openEditor(id, { isNew: true })
}

/** A just-created Area: the view flies to it and its editor opens with the provisional name selected. */
function showNewArea(id: string) {
  const area = useAppStore.getState().data.areas.find((candidate) => candidate.id === id)
  if (!area) return
  useDeskStore.getState().flyTo(areaView(area, viewport()))
  useDeskStore.getState().openAreaEditor(id, { isNew: true })
}

/** An arrangement: the Areas and their Cards slide to their places, like Tidy up, while the view shows the whole Desk. */
function arrangeDesk(targets: Arrangement) {
  useDeskStore.getState().animateTidy()
  useAppStore.getState().arrangeAreas(targets)
  showWholeDesk()
}

/** "Ver introducción": a new Welcome Card in the current language, and the view flies to it. */
function showNewWelcomeCard() {
  const view = welcomeCardView(placeWelcome())
  if (view) useDeskStore.getState().flyTo(view)
}

/** After an Import: nothing open may point at a Card that is gone; the whole new Desk comes into view. */
function showImportedDesk(title: string, detail: string) {
  useDeskStore.getState().resetAfterImport()
  showWholeDesk()
  useDeskStore.getState().showToast(title, detail)
}

/** The paper screen: the Desk, with the floating controls and the sheets over it. */
export default function App() {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const searchOpen = useDeskStore((state) => state.searchOpen)
  const toggleSearch = useDeskStore((state) => state.toggleSearch)
  const toast = useDeskStore((state) => state.toast)
  // Built here, unlike `languageOptions`: the theme names are translated.
  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'system', label: t('themeSystem') },
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
  ]

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useEffect(() => applyTheme(theme), [theme])
  usePersistentStorage()

  return (
    <main className="relative h-full overflow-hidden bg-paper">
      <Desk />

      <div className="pointer-events-none fixed top-[calc(16px+env(safe-area-inset-top,0px))] left-[calc(18px+env(safe-area-inset-left,0px))] z-10 flex items-baseline gap-2.5">
        <h1 className="font-display text-[28px] leading-none font-semibold tracking-[-0.01em] italic">mtf</h1>
        <p className="hidden text-[12.5px] text-pencil min-[521px]:block">{t('tagline')}</p>
      </div>

      <div className="fixed top-[calc(12px+env(safe-area-inset-top,0px))] right-[calc(14px+env(safe-area-inset-right,0px))] z-10 flex items-center gap-1 rounded-full bg-float p-1 shadow-paper backdrop-blur-[10px]">
        <IconButton label={t('search')} icon={Search} pressed={searchOpen} onClick={toggleSearch} />
        <WinsCounter />
        <IconButton label={t('settings')} icon={Ellipsis} onClick={() => setSettingsOpen(true)} />
      </div>

      <SearchBox />
      <Dock />
      <InstallNudge onHow={() => setSettingsOpen(true)} />

      <button
        type="button"
        aria-label={t('newCard')}
        onClick={createCardInView}
        className="fixed right-[calc(16px+env(safe-area-inset-right,0px))] bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-10 grid size-[58px] cursor-pointer place-items-center rounded-full bg-ink text-paper shadow-[0_8px_22px_rgb(0_0_0/0.22)] hover:-translate-y-px"
      >
        <Plus size={24} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <CardEditor />
      <AreaEditor />
      <MisLogros />

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('settings')} closeLabel={t('close')}>
        <div className="flex flex-col gap-2 py-2">
          <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('language')}</span>
          <Segmented label={t('language')} options={languageOptions} value={language} onChange={setLanguage} />
        </div>
        <div className="flex flex-col gap-2 py-2">
          <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('theme')}</span>
          <Segmented label={t('theme')} options={themeOptions} value={theme} onChange={setTheme} />
        </div>
        {/* Settings closes first: two sheets are never open at once. */}
        <AreasSection
          onOpenArea={(id) => {
            setSettingsOpen(false)
            useDeskStore.getState().openAreaEditor(id)
          }}
          onCreated={(id) => {
            setSettingsOpen(false)
            showNewArea(id)
          }}
          onArranged={(targets) => {
            setSettingsOpen(false)
            arrangeDesk(targets)
          }}
        />
        <BackupSection
          onImported={(data) => {
            setSettingsOpen(false)
            showImportedDesk(t('backupImported'), t('cardCount', data.cards.length))
          }}
        />
        <InstallSection />
        <WelcomeSection
          onShow={() => {
            setSettingsOpen(false)
            showNewWelcomeCard()
          }}
        />
      </Sheet>

      <Toast message={toast} />
    </main>
  )
}
