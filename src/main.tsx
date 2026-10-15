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
// Once per device, before the Desk's first view, which frames it.
placeWelcomeOnce()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
