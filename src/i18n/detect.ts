import type { Language } from '../types'

/** First-launch language: Spanish when the preferred browser language is Spanish (any region), else English. */
export function detectLanguage(languages: readonly string[]): Language {
  const preferred = languages[0]?.toLowerCase() ?? ''
  return preferred === 'es' || preferred.startsWith('es-') ? 'es' : 'en'
}
