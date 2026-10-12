import { useState } from 'react'
import { Callout } from '../components/ui/Callout'
import { useT } from '../i18n'
import { loadHintSeen, saveHintSeen } from '../lib/storage'

/** A one-time hint above the Dock: Cards can be dragged anywhere, and held on a phone. Once per device. */
export function FirstRunHint() {
  const t = useT()
  const [visible, setVisible] = useState(() => !loadHintSeen())
  if (!visible) return null

  return (
    <Callout
      message={t('hint')}
      actions={[
        {
          label: t('hintOk'),
          onClick: () => {
            saveHintSeen()
            setVisible(false)
          },
        },
      ]}
    />
  )
}
