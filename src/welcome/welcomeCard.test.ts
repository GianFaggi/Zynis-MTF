import { describe, expect, it } from 'vitest'
import { es } from '../i18n/locales/es'
import { en } from '../i18n/locales/en'
import { makeArea } from '../test/fixtures'
import { welcomeContent } from './welcome'
import { welcomeCard } from './welcomeCard'

const area = makeArea({ id: 'a1', rect: { x: 80, y: 120, w: 980, h: 1000 } })
const content = { title: 'Hola', body: 'Probá esto:', items: ['Uno', 'Dos', 'Tres'] as [string, string, string] }

function ids() {
  let n = 0
  return () => `id${++n}`
}

describe('welcomeCard', () => {
  const card = welcomeCard(area, content, { z: 7, now: 1000, newId: ids() })

  it('is a plain Card in the Area, at the top-left of where Cards are placed, straight and on the given z', () => {
    expect(card.areaId).toBe('a1')
    expect(card.position).toEqual({ x: 150, y: 270, tilt: 0, z: 7 })
    expect(card.pinned).toBe(false)
    expect(card.jarredAt).toBeNull()
    expect(card.createdAt).toBe(1000)
    expect(card.updatedAt).toBe(1000)
  })

  it('holds the content, with three unchecked Items in order, each with its own id', () => {
    expect(card.title).toBe('Hola')
    expect(card.body).toBe('Probá esto:')
    expect(card.items.map((item) => item.text)).toEqual(['Uno', 'Dos', 'Tres'])
    expect(card.items.every((item) => !item.done && item.createdAt === 1000 && item.updatedAt === 1000)).toBe(true)
    expect(new Set([card.id, ...card.items.map((item) => item.id)]).size).toBe(4)
  })
})

describe('welcomeContent', () => {
  it.each([
    ['es', es],
    ['en', en],
  ] as const)('is the %s copy', (language, messages) => {
    expect(welcomeContent(language)).toEqual({
      title: messages.welcomeTitle,
      body: messages.welcomeBody,
      items: [messages.welcomeDrag, messages.welcomeCheck, messages.welcomeJar],
    })
  })

  it('greets in the language asked for', () => {
    expect(welcomeContent('en').title).toBe('Hi! This is MTF')
    expect(welcomeContent('es').title).toBe('¡Hola! Esto es MTF')
  })
})
