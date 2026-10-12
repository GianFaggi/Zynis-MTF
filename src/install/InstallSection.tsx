import { Share } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useT } from '../i18n'
import { install, useInstallMode } from './installStore'

/**
 * The install group of the Settings sheet: why installing keeps the notes safer, then
 * what fits this device. Installed → one line; iPhone/iPad → Safari's steps; a browser
 * that offers installing → its dialog; anywhere else → where to look in the menu.
 */
export function InstallSection() {
  const t = useT()
  const mode = useInstallMode()

  return (
    <div className="flex flex-col gap-2 py-2">
      <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('installApp')}</span>
      <p className="max-w-[52ch] text-sm text-ink-2">{t('installWhy')}</p>
      {mode === 'installed' && <p className="text-sm font-medium text-ink">{t('installed')}</p>}
      {mode === 'ios' && (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink marker:text-pencil">
          <li>
            {t('iosShare')}{' '}
            <Share size={15} strokeWidth={1.9} aria-hidden="true" className="inline-block align-[-2px]" />
          </li>
          <li>{t('iosAddToHome')}</li>
          <li>{t('iosOpen')}</li>
        </ol>
      )}
      {mode === 'prompt' && (
        <div>
          <Button variant="primary" onClick={install}>
            {t('installButton')}
          </Button>
        </div>
      )}
      {mode === 'manual' && <p className="max-w-[52ch] text-sm text-ink">{t('installManual')}</p>}
    </div>
  )
}
