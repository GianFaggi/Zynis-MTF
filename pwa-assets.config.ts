import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// App icons from public/logo.svg: `npm run generate-pwa-assets`, then commit the PNGs.
// The logo already fills its square with paper, so the regular icons get no padding
// and the maskable / Apple icons are padded with paper instead of the default white.
const paper = { background: '#F5F1EA', fit: 'contain' } as const

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: paper },
    apple: { ...minimal2023Preset.apple, resizeOptions: paper },
  },
  images: ['public/logo.svg'],
})
