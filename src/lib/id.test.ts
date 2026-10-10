import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId, uuidFromRandomValues } from './id'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a v4 UUID', () => {
    expect(newId()).toMatch(V4)
  })

  it('returns 1 000 unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId))
    expect(ids.size).toBe(1000)
  })

  it('falls back to getRandomValues when randomUUID is missing (insecure context)', () => {
    const real = globalThis.crypto
    const getRandomValues = vi.fn((array: Uint8Array<ArrayBuffer>) => real.getRandomValues(array))
    vi.stubGlobal('crypto', { getRandomValues })

    const ids = new Set(Array.from({ length: 1000 }, newId))
    expect(getRandomValues).toHaveBeenCalled()
    expect(ids.size).toBe(1000)
    for (const id of ids) expect(id).toMatch(V4)
  })

  it('fallback sets the version and variant bits', () => {
    expect(uuidFromRandomValues()).toMatch(V4)
  })
})
