import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { PlaneWait } from '../sync/PlaneWait'
import { wakeApi } from './api'
import { googleLoginUrl } from './google'

// The Google window's first page (design decision 5). `main.tsx` renders only this for
// `#google=<hash>&lang=`: no Desk, no welcome Card, no mail-link listener. The page is
// precached, so it shows at once even while Render sleeps, and goes on to Google only once
// `/health` answers, so the window never shows Render's loading page.

/**
 * The paper plane until the API answers, then on to Google with `location.replace`, so Back
 * never returns here. Awake, that is within the plane's quiet 1.5 s and no plane shows. If the
 * wait gives up, it stays on the plane's calm message: the Account sheet keeps waiting until
 * its 5 minutes or Cancel.
 */
export function GoogleWait({ hash }: { hash: string }) {
  const language = useAppStore((state) => state.language)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    let live = true
    void wakeApi().then((awake) => {
      if (live && awake) location.replace(googleLoginUrl(hash, language))
    })
    return () => {
      live = false
    }
  }, [hash, language])

  return (
    <main className="flex h-full items-center justify-center bg-paper px-5 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="w-full max-w-[440px]">
        <PlaneWait />
      </div>
    </main>
  )
}
