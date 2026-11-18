import { useId, type ReactNode } from 'react'
import { backupFile } from '../backup/backup'
import { deliverFile } from '../backup/deliver'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { chooseAccount, chooseUpload, closeChoice, markExported } from './engine'
import type { DeskSummary } from './firstSignIn'
import { relativeTime } from './relativeTime'
import { useSyncStore } from './syncStore'
import { useNow } from './useNow'

/**
 * The first sign-in dialog (#37, design D12, D14): this device's Desk and the Account's side by side
 * (stacked on a phone), with two plain buttons and neither styled or focused as the default. Closing
 * it changes nothing; the next arrival asks again. When the copy of this Desk does not fit, Usar el de
 * la cuenta waits for an Export.
 */
export function SyncChoice() {
  const t = useT()
  const choice = useSyncStore((state) => state.choice)
  const blocked = choice !== null && choice.noRoom && !choice.exported

  const exportFirst = () => {
    // Built synchronously in the click: iOS opens the share sheet only from a user gesture.
    void deliverFile(backupFile(useAppStore.getState().data, new Date())).then((delivery) => {
      if (delivery !== 'cancelled') markExported()
    })
  }

  return (
    <Sheet open={choice !== null} onClose={closeChoice} title={t('choiceTitle')} closeLabel={t('close')}>
      {choice && (
        <div className="flex flex-col gap-3 pb-2">
          <p className="max-w-[52ch] text-sm text-ink-2">{t('choiceIntro')}</p>
          <div className="grid gap-3 min-[521px]:grid-cols-2">
            <Side title={t('choiceThisDevice')} summary={choice.local} note={t('choiceUploadNote')}>
              <Button onClick={chooseUpload}>{t('choiceUpload')}</Button>
            </Side>
            <Side title={t('choiceTheAccount')} summary={choice.remote} note={t('choiceUseAccountNote')}>
              <Button onClick={chooseAccount} disabled={blocked}>
                {t('choiceUseAccount')}
              </Button>
            </Side>
          </div>
          {choice.noRoom && (
            <div role="status" className="flex flex-col gap-2 rounded-[14px] bg-hover p-3.5">
              <p className="max-w-[52ch] text-sm">{t('choiceNoRoom')}</p>
              <div>
                <Button onClick={exportFirst}>{t('exportBackup')}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

function Side({ title, summary, note, children }: { title: string; summary: DeskSummary; note: string; children: ReactNode }) {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const now = useNow()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5 rounded-[14px] border border-rule p-3.5">
      <h3 id={headingId} className="font-display text-lg leading-tight font-semibold">
        {title}
      </h3>
      <ul className="flex flex-col gap-0.5 text-sm text-ink-2">
        <li>{t('choiceDesk', summary.desk)}</li>
        <li>{t('choiceJar', summary.jar)}</li>
        <li>{t('choiceAreas', summary.areas)}</li>
        <li>
          {summary.updatedAt === null
            ? t('choiceNoChanges')
            : t('choiceUpdated', relativeTime(summary.updatedAt, now, language))}
        </li>
      </ul>
      <p className="text-[13.5px] text-pencil">{note}</p>
      <div>{children}</div>
    </section>
  )
}
