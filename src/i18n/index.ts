import { useAppStore } from '../store/appStore'
import type { Language } from '../types'
import { en } from './locales/en'
import { es, type Messages } from './locales/es'

export { detectLanguage } from './detect'

const dictionaries: Record<Language, Messages> = { es, en }

/** Names shown in the language selector, each in its own language. */
export const languageNames: Record<Language, string> = { es: 'Español', en: 'English' }

type MessageKey = keyof Messages
type MessageArgs<K extends MessageKey> = Messages[K] extends (...args: infer A) => string ? A : []

export function translate<K extends MessageKey>(language: Language, key: K, ...args: MessageArgs<K>): string {
  const message: unknown = dictionaries[language][key]
  return typeof message === 'function' ? message(...args) : (message as string)
}

export type Translate = <K extends MessageKey>(key: K, ...args: MessageArgs<K>) => string

/** `t(key, ...args)` in the current language; re-renders when the language changes. */
export function useT(): Translate {
  const language = useAppStore((state) => state.language)
  return (key, ...args) => translate(language, key, ...args)
}
