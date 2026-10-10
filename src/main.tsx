import '@fontsource-variable/figtree'
import '@fontsource-variable/literata'
import '@fontsource-variable/literata/wght-italic.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
