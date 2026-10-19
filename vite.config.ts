/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const paper = '#F5F1EA'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // KB/frontend/pwa.md. The whole app shell is precached so MTF opens offline.
    // `autoUpdate` + the injected register script (no `virtual:pwa-register` import):
    // a new version installs in the background and runs on the next launch, with no
    // prompt and no reload of the open page.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MTF By Zynis',
        short_name: 'MTF By Zynis',
        description: 'Un anotador con forma de escritorio que celebra lo que terminás.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: paper,
        background_color: paper,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // The glob below already precaches the icons and the plugin adds the manifest itself.
      includeManifestIcons: false,
      workbox: {
        // Fonts: only the latin and latin-ext subsets (Spanish + English); Fontsource
        // also emits cyrillic, greek and vietnamese files that MTF never needs offline.
        globPatterns: ['**/*.{html,js,css,svg,png,ico}', '**/*-latin-wght-*.woff2', '**/*-latin-ext-wght-*.woff2'],
        cleanupOutdatedCaches: true,
        // A new worker activates at once and takes over open pages without reloading them.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
