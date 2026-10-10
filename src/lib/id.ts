/**
 * A new v4 UUID for an entity id.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost). Testing
 * on a phone against `vite --host` over plain http is not one, so fall back to
 * building the UUID from `crypto.getRandomValues()`, which works everywhere.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return uuidFromRandomValues()
}

export function uuidFromRandomValues(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
