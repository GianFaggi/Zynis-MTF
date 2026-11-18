import { Button } from '../components/ui/Button'
import { useDeskStore } from '../desk/deskStore'
import { showWholeDesk } from '../desk/view'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { recoverPrevious, syncNow } from './engine'
import { relativeTime } from './relativeTime'
import { useSyncStore } from './syncStore'
import { useNow } from './useNow'

/**
 * Sync in the Account section and sheet (#37): when the last sync finished, what waits to be sent,
 * Sincronizar ahora, and Recuperar el escritorio anterior during the 30 days after a replacement.
 * Reads only `syncStore`, so showing it makes no request. Calm words, ink and paper, no warning color.
 */
export function SyncStatus() {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const syncing = useSyncStore((state) => state.syncing)
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt)
  const pendingCount = useSyncStore((state) => state.pendingCount)
  const replacedUntil = useSyncStore((state) => state.replacedUntil)
  const now = useNow()
  const canRecover = replacedUntil !== null && replacedUntil > now

  const recover = () => {
    recoverPrevious()
    showWholeDesk()
    useDeskStore.getState().showToast(t('syncRecovered'))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[13.5px] text-pencil">
        <p>{lastSyncAt === null ? t('syncNever') : t('syncLast', relativeTime(lastSyncAt, now, language))}</p>
        {pendingCount > 0 && <p>{t('syncPending', pendingCount)}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={syncing} onClick={() => void syncNow()}>
          {t('syncNow')}
        </Button>
        {canRecover && <Button onClick={recover}>{t('syncRecover')}</Button>}
      </div>
      {canRecover && (
        <p className="max-w-[52ch] text-[13.5px] text-pencil">
          {t('syncRecoverNote', new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date(replacedUntil)))}
        </p>
      )}
    </div>
  )
}
