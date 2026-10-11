import { createLucideIcon } from 'lucide-react'

// lucide has no jar. This is the mockup's 16 px jar (design/mtf-mockup-desk.html),
// scaled ×1.5 to lucide's 24 px grid so its stroke matches the other icons. Made with
// lucide's own factory, it is a regular `LucideIcon`: same props, `aria-hidden` by default.
export const JarIcon = createLucideIcon({
  name: 'jar',
  node: [
    [
      'path',
      {
        d: 'M7.5 2.7h9M8.4 5.7h7.2M6.3 8.1c-1.2 0-1.8.6-1.8 1.8v9.3c0 1.35.75 2.1 2.1 2.1h10.8c1.35 0 2.1-.75 2.1-2.1V9.9c0-1.2-.6-1.8-1.8-1.8z',
        key: 'jar',
      },
    ],
  ],
})
