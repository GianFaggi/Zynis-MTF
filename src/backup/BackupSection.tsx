import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import { Button } from '../components/ui/Button'
import { useDeskStore } from '../desk/deskStore'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Language, MtfData } from '../types'
import { totalDone } from '../wins/stats'
import { backupFileName, makeBackup, readBackup, type BackupResult } from './backup'
import { deliverFile } from './deliver'

type Refusal = Extract<BackupResult, { ok: false }>['reason']
type Accepted = Extract<BackupResult, { ok: true }>

type Step = { name: 'idle' } | { name: 'error'; reason: Refusal } | { name: 'confirm'; backup: Accepted }

const refusalMessages = { notBackup: 'notBackup', newer: 'newerBackup', damaged: 'damagedBackup' } as const

type BackupSectionProps = {
  /** After a confirmed Import has replaced the data. */
  onImported: (data: MtfData) => void
}

/**
 * The Backup group of the Settings sheet: Export, and Import with its check and
 * confirmation. A refused file shows an inline alert (a toast would vanish before it
 * is read); an accepted one swaps the buttons for a summary that asks before replacing.
 * Nothing is written before "Reemplazar mis datos".
 */
export function BackupSection({ onImported }: BackupSectionProps) {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const cardsHere = useAppStore((state) => state.data.cards.length)
  const [step, setStep] = useState<Step>({ name: 'idle' })
  const fileInput = useRef<HTMLInputElement>(null)
  const confirmHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (step.name === 'confirm') confirmHeading.current?.focus()
  }, [step.name])

  const exportBackup = () => {
    // Built synchronously in the click: iOS opens the share sheet only from a user gesture.
    const now = new Date()
    const name = backupFileName(now)
    const file = new File([makeBackup(useAppStore.getState().data, now)], name, { type: 'application/json' })
    setStep({ name: 'idle' })
    void deliverFile(file).then((delivery) => {
      if (delivery !== 'cancelled') useDeskStore.getState().showToast(t('backupReady'), name)
    })
  }

  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset, so picking the same file again still fires `change`.
    event.target.value = ''
    if (!file) return
    const result = readBackup(await file.text())
    setStep(result.ok ? { name: 'confirm', backup: result } : { name: 'error', reason: result.reason })
  }

  const confirmImport = (data: MtfData) => {
    useAppStore.getState().replaceData(data)
    setStep({ name: 'idle' })
    onImported(data)
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('backup')}</span>
      <p className="max-w-[52ch] text-sm text-ink-2">{t('backupNote')}</p>

      {step.name === 'confirm' ? (
        <ImportSummary
          backup={step.backup}
          language={language}
          cardsHere={cardsHere}
          headingRef={confirmHeading}
          onConfirm={() => confirmImport(step.backup.data)}
          onCancel={() => setStep({ name: 'idle' })}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportBackup}>{t('exportBackup')}</Button>
          <Button onClick={() => fileInput.current?.click()}>{t('importBackup')}</Button>
        </div>
      )}
      {step.name === 'error' && (
        <p role="alert" className="max-w-[52ch] text-sm font-medium text-ink">
          {t(refusalMessages[step.reason])}
        </p>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={t('importBackup')}
        onChange={(event) => void pickFile(event)}
      />
    </div>
  )
}

type ImportSummaryProps = {
  backup: Accepted
  language: Language
  cardsHere: number
  headingRef: RefObject<HTMLHeadingElement | null>
  onConfirm: () => void
  onCancel: () => void
}

function ImportSummary({ backup, language, cardsHere, headingRef, onConfirm, onCancel }: ImportSummaryProps) {
  const t = useT()
  const { cards, events } = backup.data
  const inJar = cards.filter((card) => card.jarredAt !== null).length
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date(backup.exportedAt))

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-hover p-3.5">
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-lg leading-tight font-semibold outline-none">
        {t('backupFrom', date)}
      </h3>
      <ul className="flex flex-col gap-0.5 text-sm text-ink-2">
        <li>{t('backupDesk', cards.length - inJar)}</li>
        <li>{t('backupJar', inJar)}</li>
        <li>{t('backupDone', totalDone(events))}</li>
      </ul>
      <p className="max-w-[52ch] text-sm">{t('replaceWarning', cardsHere)}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onConfirm}>
          {t('replaceData')}
        </Button>
        <Button onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </div>
  )
}
