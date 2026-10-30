import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { INDICATOR_DELAY } from './wait'

/**
 * A quiet paper plane for the tools pill while a sync takes a while: mounted means
 * waiting, and nothing shows until the wait passes `INDICATOR_DELAY`, so a quick
 * sync never flickers. The size of an `IconButton`, but not a button: there is
 * nothing to press while syncing. Ink, never the accent.
 */
export function SyncIndicator() {
  const t = useT()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), INDICATOR_DELAY)
    return () => clearTimeout(timer)
  }, [])

  if (!shown) return null
  return (
    <span role="img" aria-label={t('syncing')} title={t('syncing')} className="grid size-[38px] flex-none place-items-center rounded-full text-ink-2">
      <Send size={18} strokeWidth={1.75} aria-hidden="true" className="animate-sway" />
    </span>
  )
}
