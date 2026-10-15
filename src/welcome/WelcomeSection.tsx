import { Button } from '../components/ui/Button'
import { useT } from '../i18n'

type WelcomeSectionProps = {
  /** "Ver introducción": the caller closes Settings and places a new Welcome Card. */
  onShow: () => void
}

/** The last group of the Settings sheet: brings the Welcome Card back (#20). */
export function WelcomeSection({ onShow }: WelcomeSectionProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-2 py-2">
      <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('introduction')}</span>
      <div>
        <Button onClick={onShow}>{t('seeIntro')}</Button>
      </div>
    </div>
  )
}
