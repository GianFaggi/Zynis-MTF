import '@fontsource-variable/figtree'
import '@fontsource-variable/literata'
import '@fontsource-variable/literata/wght-italic.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { listenForInstall } from './install/installStore'
import { applyTheme } from './lib/theme'
import { useAppStore } from './store/appStore'
import { placeWelcomeOnce } from './welcome/welcome'

// Before rendering: Chromium can offer the install before React mounts.
listenForInstall()
// A chosen Light or Dark in place before React's first commit (System needs nothing).
applyTheme(useAppStore.getState().theme)
const root = createRoot(document.getElementById('root')!)

// Dev only: `/?avion` shows the paper plane preview instead of the Desk. A production
// build replaces `import.meta.env.DEV` with `false`, so this branch and its chunk are dropped.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('avion')) {
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

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
