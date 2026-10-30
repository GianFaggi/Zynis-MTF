import { useT } from '../i18n'
import { PaperPlane } from './PaperPlane'
import { useWaitStage } from './useWaitStage'
import type { WaitStage } from './wait'

const MESSAGES: { [S in WaitStage]: `wait${Capitalize<S>}` } = {
  entering: 'waitEntering',
  connecting: 'waitConnecting',
  waking: 'waitWaking',
  almost: 'waitAlmost',
  failed: 'waitFailed',
}

/**
 * What a sheet shows while it waits for the server: mounted means waiting, so the
 * caller renders it while its request is pending. No progress bar and no countdown,
 * only calm messages; the plane takes off after 1.5 s (a quick answer never flickers)
 * and comes to rest at 90 s. The scene keeps its height while it is empty, and the
 * status region is always mounted, so screen readers announce each new message.
 */
export function PlaneWait() {
  const t = useT()
  const stage = useWaitStage()
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="aspect-[320/72] w-full max-w-[320px]">
        {stage !== 'entering' && <PaperPlane flying={stage !== 'failed'} />}
      </div>
      <p role="status" aria-live="polite" className="min-h-[3em] max-w-[34ch] text-center text-[15px] text-ink-2">
        {t(MESSAGES[stage])}
      </p>
    </div>
  )
}
