import { AREA_COLORS } from '../desk/areas'
import type { MtfData } from '../types'

// The strict entity check for a Backup (ADR 0006). `loadData()` trusts the entities
// because MTF wrote them; a Backup comes from outside, so every Area, Card, Item and
// win event is checked before Import offers to replace anything. Unknown extra fields
// are allowed (and kept). A win event's `cardId` may point at no Card: it only miscounts.

type Entity = Record<string, unknown>

const COLORS = new Set<string>(AREA_COLORS)
const AREA_KEYS = new Set(['work', 'life', 'remember'])
const EVENT_TYPES = new Set(['item', 'card', 'note'])

const isEntity = (value: unknown): value is Entity => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isId = (value: unknown): value is string => typeof value === 'string' && value !== ''
const isOptional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value)
const isString = (value: unknown) => typeof value === 'string'

/** Every key of `value` is a finite number. */
function hasNumbers(value: unknown, keys: string[]): value is Entity {
  return isEntity(value) && keys.every((key) => isNumber(value[key]))
}

/** A list of entities that all pass `check`, with ids unique within `seen`. */
function allValid(list: unknown, seen: Set<string>, check: (entity: Entity) => boolean): list is Entity[] {
  if (!Array.isArray(list)) return false
  return list.every((entity) => {
    if (!isEntity(entity) || !isId(entity.id) || seen.has(entity.id) || !check(entity)) return false
    seen.add(entity.id)
    return true
  })
}

const isStamped = (entity: Entity) => isNumber(entity.createdAt) && isNumber(entity.updatedAt)

function isArea(area: Entity): boolean {
  return (
    isStamped(area) &&
    COLORS.has(area.color as string) &&
    isOptional(area.key, (key) => AREA_KEYS.has(key as string)) &&
    isOptional(area.name, isString) &&
    hasNumbers(area.rect, ['x', 'y', 'w', 'h']) &&
    (area.rect.w as number) > 0 &&
    (area.rect.h as number) > 0
  )
}

function isItem(item: Entity): boolean {
  return isStamped(item) && isString(item.text) && typeof item.done === 'boolean'
}

function isCard(card: Entity, areaIds: Set<string>, itemIds: Set<string>): boolean {
  return (
    isStamped(card) &&
    areaIds.has(card.areaId as string) &&
    isString(card.title) &&
    isString(card.body) &&
    typeof card.pinned === 'boolean' &&
    hasNumbers(card.position, ['x', 'y', 'tilt', 'z']) &&
    (card.jarredAt === null || isNumber(card.jarredAt)) &&
    allValid(card.items, itemIds, isItem)
  )
}

function isEvent(event: Entity): boolean {
  return (
    EVENT_TYPES.has(event.type as string) &&
    isNumber(event.at) &&
    ['cardId', 'itemId', 'title', 'areaId'].every((key) => isOptional(event[key], isString))
  )
}

/** Whether a document's Areas, Cards, Items and win events all have a valid shape. */
export function isValidData(doc: unknown): doc is MtfData {
  if (!isEntity(doc)) return false
  const areaIds = new Set<string>()
  const itemIds = new Set<string>()
  return (
    allValid(doc.areas, areaIds, isArea) &&
    areaIds.size > 0 &&
    allValid(doc.cards, new Set(), (card) => isCard(card, areaIds, itemIds)) &&
    allValid(doc.events, new Set(), isEvent)
  )
}
