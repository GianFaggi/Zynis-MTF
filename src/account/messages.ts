import type { Messages } from '../i18n/locales/es'

// The API sends codes, never text for users (openspec/specs/backend-service): the app says
// each one in the current language. `password_short` is the form's own check, before any request.

/** A message that is plain text, not a function of values. */
export type TextKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages]

const keys: Record<string, TextKey> = {
  invalid_credentials: 'errorInvalidCredentials',
  email_not_verified: 'errorEmailNotVerified',
  invalid_email: 'errorInvalidEmail',
  invalid_password: 'errorPasswordInvalid',
  password_short: 'errorPasswordShort',
  too_many_requests: 'errorTooManyRequests',
  timeout: 'waitFailed',
  offline: 'offlineNote',
  google_failed: 'errorGoogle',
  google_timeout: 'errorGoogleTimeout',
}

/** The message for a failure code; anything unexpected gets a calm generic line. */
export function errorMessageKey(code: string): TextKey {
  return keys[code] ?? 'errorGeneric'
}
