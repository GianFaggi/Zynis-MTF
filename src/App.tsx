import { Ellipsis, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BackupSection } from './backup/BackupSection'
import { IconButton } from './components/ui/IconButton'
import { Segmented } from './components/ui/Segmented'
import { Sheet } from './components/ui/Sheet'
import { Toast } from './components/ui/Toast'
import { CardEditor } from './desk/CardEditor'
import { Desk } from './desk/Desk'
import { Dock } from './desk/Dock'
import { FirstRunHint } from './desk/FirstRunHint'
import { useDeskStore } from './desk/deskStore'
import { viewport } from './desk/dom'
import { SearchBox } from './desk/SearchBox'
import { toWorld } from './desk/geometry'
import { showWholeDesk } from './desk/view'
import { languageNames, useT } from './i18n'
import { InstallNudge } from './install/InstallNudge'
import { InstallSection } from './install/InstallSection'
import { useAppStore } from './store/appStore'
import { usePersistentStorage } from './store/usePersistentStorage'
import { MisLogros } from './wins/MisLogros'
import { WinsCounter } from './wins/WinsCounter'

const languageOptions = (['es', 'en'] as const).map((value) => ({ value, label: languageNames[value] }))

/** A new Card in the middle of the view, opened in the editor. */
function createCardInView() {
  const { w, h } = viewport()
  const id = useAppStore.getState().createCard(toWorld(useDeskStore.getState().view, { x: w / 2, y: h / 2 }))
  if (id) useDeskStore.getState().openEditor(id, { isNew: true })
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const searchOpen = useDeskStore((state) => state.searchOpen)
  const toggleSearch = useDeskStore((state) => state.toggleSearch)
  const toast = useDeskStore((state) => state.toast)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
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
      <FirstRunHint />
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
      <MisLogros />

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('settings')} closeLabel={t('close')}>
        <div className="flex flex-col gap-2 py-2">
          <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('language')}</span>
          <Segmented label={t('language')} options={languageOptions} value={language} onChange={setLanguage} />
        </div>
        <BackupSection
          onImported={(data) => {
            setSettingsOpen(false)
            showImportedDesk(t('backupImported'), t('cardCount', data.cards.length))
          }}
        />
        <InstallSection />
      </Sheet>

      <Toast message={toast} />
    </main>
  )
}
