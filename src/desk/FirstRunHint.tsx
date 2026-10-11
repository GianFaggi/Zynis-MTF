import { useState } from 'react'
import { useT } from '../i18n'
import { loadHintSeen, saveHintSeen } from '../lib/storage'

/** A one-time hint above the Dock: Cards can be dragged anywhere, and held on a phone. Once per device. */
export function FirstRunHint() {
  const t = useT()
  const [visible, setVisible] = useState(() => !loadHintSeen())
  if (!visible) return null

  return (
    <div
      role="note"
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-1/2 z-10 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-[14px] bg-ink py-2.5 pr-2.5 pl-4 text-sm text-paper shadow-paper"
    >
      <span>{t('hint')}</span>
      <button
        type="button"
        onClick={() => {
          saveHintSeen()
          setVisible(false)
        }}
        className="h-[30px] flex-none cursor-pointer rounded-[9px] bg-[color-mix(in_oklab,var(--color-paper)_16%,transparent)] px-3 text-[13px] font-semibold"
      >
        {t('hintOk')}
      </button>
    </div>
  )
}
