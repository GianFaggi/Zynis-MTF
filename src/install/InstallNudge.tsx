import { useEffect, useState } from 'react'
import { Callout } from '../components/ui/Callout'
import { useT } from '../i18n'
import { loadHintSeen, loadInstallNudgeSeen, saveInstallNudgeSeen } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import type { MtfData } from '../types'
import { installMode, useInstallStore } from './installStore'

// A one-time nudge to install MTF (KB/frontend/pwa.md#install-guidance). It waits for
// the user to keep a new Card in this session (a new `note` event), so it never greets
// a new user with a demand nor shows on a reload. Only where installing is possible
// and MTF is not installed, and never on top of the first-run hint. Once per device.

const notesIn = (data: MtfData) => data.events.filter((event) => event.type === 'note').length

type InstallNudgeProps = {
  /** "Cómo": opens Settings, where the install section is. */
  onHow: () => void
}

export function InstallNudge({ onHow }: InstallNudgeProps) {
  const t = useT()
  const [shown, setShown] = useState(false)
  const installed = useInstallStore((state) => state.installed)

  useEffect(
    () =>
      useAppStore.subscribe((state, previous) => {
        if (notesIn(state.data) <= notesIn(previous.data)) return
        const mode = installMode()
        if ((mode === 'ios' || mode === 'prompt') && loadHintSeen() && !loadInstallNudgeSeen()) setShown(true)
      }),
    [],
  )

  useEffect(() => {
    if (installed) saveInstallNudgeSeen()
  }, [installed])

  if (!shown || installed) return null

  const answer = (then?: () => void) => () => {
    saveInstallNudgeSeen()
    setShown(false)
    then?.()
  }

  return (
    <Callout
      message={t('installNudge')}
      actions={[
        { label: t('installHow'), onClick: answer(onHow) },
        { label: t('notNow'), onClick: answer() },
      ]}
    />
  )
}
