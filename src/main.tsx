import '@fontsource-variable/figtree'
import '@fontsource-variable/literata'
import '@fontsource-variable/literata/wght-italic.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { listenForInstall } from './install/installStore'

// Before rendering: Chromium can offer the install before React mounts.
listenForInstall()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
