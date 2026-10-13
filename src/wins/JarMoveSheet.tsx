import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { useT } from '../i18n'
import type { AreaColor } from '../types'

type JarMoveSheetProps = {
  /** The other Area's name, already translated. */
  name: string
  color: AreaColor
  onYes: () => void
  /** No, `Esc`, the close button or the scrim. */
  onNo: () => void
}

/**
 * Asked when a Card the Jar would accept is dropped on another Area's Jar (#19):
 * move it there and put it in the Jar, or not. The Desk keeps the Card lifted where
 * it was released until the answer; the scrim blocks any other gesture meanwhile.
 */
export function JarMoveSheet({ name, color, onYes, onNo }: JarMoveSheetProps) {
  const t = useT()
  return (
    <Sheet open onClose={onNo} title={t('jarMoveQuestion', name)} closeLabel={t('close')} tint={color}>
      <div className="flex justify-end gap-2">
        <Button onClick={onNo}>{t('no')}</Button>
        <Button variant="primary" onClick={onYes}>
          {t('yes')}
        </Button>
      </div>
    </Sheet>
  )
}
