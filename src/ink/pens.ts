import type { Translate } from '../i18n'
import type { Pens } from '../types'
import { INK_SIZES } from './constants'

// Pen labels shared by the tray and the pen editor (#51, design D6).

export type PenIndex = Pens['chosen']

/** The pen indexes, in tray order: Tinta first. */
export const PEN_INDEXES: readonly PenIndex[] = [0, 1, 2, 3]

export type PenWidth = keyof typeof INK_SIZES

/** The width presets, thinnest first, with their label keys. */
export const PEN_WIDTHS: readonly { width: PenWidth; size: number; label: 'penFine' | 'penMedium' | 'penBold' }[] = [
  { width: 'fine', size: INK_SIZES.fine, label: 'penFine' },
  { width: 'medium', size: INK_SIZES.medium, label: 'penMedium' },
  { width: 'bold', size: INK_SIZES.bold, label: 'penBold' },
]

/** "Tinta", "Lápiz 2"…, in the current language. */
export function penName(t: Translate, index: PenIndex): string {
  return index === 0 ? t('penInk') : t('penNumbered', index + 1)
}

/** The preset a size is, if any: a pen stored with a size from before a retune matches none. */
export function penWidth(size: number): PenWidth | undefined {
  return PEN_WIDTHS.find((preset) => preset.size === size)?.width
}

/** "Fino", "Medio", "Grueso" for a preset; "Grosor 9" for a step between them (design D2). */
export function widthLabel(t: Translate, size: number): string {
  const preset = PEN_WIDTHS.find((candidate) => candidate.size === size)
  return preset ? t(preset.label) : t('penSize', size)
}
