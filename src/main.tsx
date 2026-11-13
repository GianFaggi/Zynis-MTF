import '@fontsource-variable/figtree'
import '@fontsource-variable/literata'
import '@fontsource-variable/literata/wght-italic.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { readGoogleWait } from './account/google'
import { listenForAccountLinks } from './account/links'
import { listenForInstall } from './install/installStore'
import { applyTheme } from './lib/theme'
import { useAppStore } from './store/appStore'
import { placeWelcomeOnce } from './welcome/welcome'

// Before rendering: Chromium can offer the install before React mounts.
listenForInstall()
// A chosen Light or Dark in place before React's first commit (System needs nothing).
applyTheme(useAppStore.getState().theme)
const root = createRoot(document.getElementById('root')!)
const googleWait = readGoogleWait(location.hash)

// The Google window (`#google=<hash>&lang=`, design decision 5): only the paper plane, then on
// to Google. Read before anything else, so this window never places the welcome Card or reads
// mail links. Its language comes from the address and is not saved: on an installed iPhone this
// window has storage of its own, which may never have seen the user's choice.
if (googleWait) {
  if (googleWait.language) useAppStore.setState({ language: googleWait.language })
  void import('./account/GoogleWait').then(({ GoogleWait }) =>
    root.render(
      <StrictMode>
        <GoogleWait hash={googleWait.hash} />
      </StrictMode>,
    ),
  )
} else if (import.meta.env.DEV && new URLSearchParams(location.search).has('avion')) {
  // Dev only: `/?avion` shows the paper plane preview instead of the Desk. A production
  // build replaces `import.meta.env.DEV` with `false`, so this branch and its chunk are dropped.
  void import('./sync/PlanePreview').then(({ PlanePreview }) =>
    root.render(
      <StrictMode>
        <PlanePreview />
      </StrictMode>,
    ),
  )
} else {
  // Once per device, before the Desk's first view, which frames it.
  placeWelcomeOnce()
  // A mail link (#verify= / #reset=), now or later: opens the Account sheet on its step and clears the address.
  listenForAccountLinks()

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
