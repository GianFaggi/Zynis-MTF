// Which pointer draws in the handwriting box (#47, design D5). The pen and the mouse
// always draw; the finger draws until the box has seen a pen, so a palm resting on an
// iPad leaves no marks while a phone, which never sees a pen, still writes with a
// finger. `penSeen` lives in the box and resets when the editor closes. Pure, so every
// cell of the table is unit-tested.

/** `PointerEvent.pointerType`; anything unknown counts as the mouse. */
export type InkPointer = 'pen' | 'mouse' | 'touch'

export function inkPointer(pointerType: string): InkPointer {
  return pointerType === 'pen' || pointerType === 'touch' ? pointerType : 'mouse'
}

/** The D5 table: whether a pointer pressed in the box draws. */
export function shouldDraw({ pointerType, penSeen }: { pointerType: InkPointer; penSeen: boolean }): boolean {
  return pointerType !== 'touch' || !penSeen
}

/**
 * What a `pointerdown` does, given the pointer already drawing (`live`, or `null`):
 * - `draw`: start a stroke;
 * - `ignore`: nothing (a finger after a pen, or a second pointer during a stroke);
 * - `replace`: a pen while a finger stroke is live. The palm usually lands a moment before
 *   the Pencil, so that finger stroke is discarded and the pen's stroke starts.
 */
export function pointerDown({
  pointerType,
  penSeen,
  live,
}: {
  pointerType: InkPointer
  penSeen: boolean
  live: InkPointer | null
}): 'draw' | 'ignore' | 'replace' {
  if (live === 'touch' && pointerType === 'pen') return 'replace'
  if (live !== null) return 'ignore'
  return shouldDraw({ pointerType, penSeen }) ? 'draw' : 'ignore'
}

/** The eraser end of a Wacom-style pen sets bit 32 of `buttons`; it erases without choosing the tool. */
export function isEraserEnd(pointerType: InkPointer, buttons: number): boolean {
  return pointerType === 'pen' && (buttons & 32) !== 0
}
