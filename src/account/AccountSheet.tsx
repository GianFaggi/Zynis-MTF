import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { TextField } from '../components/ui/TextField'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { PlaneWait } from '../sync/PlaneWait'
import { apiRequest, wakeApi, type ApiResult } from './api'
import { clearLink, closeAccount, loadMe, signedIn, signOut, useAccountStore, type Tokens } from './accountStore'
import { newHandoff, openGoogleWindow, useGoogleWatch, type Handoff } from './google'
import { useCountdown, useOnline } from './hooks'
import { errorMessageKey, type TextKey } from './messages'

// The Account sheet (openspec/specs/accounts, design decision 8, design/mtf-mockup-cuenta.html).
// Every request waits with the paper plane in place of its form, the typed values kept; errors
// are an inline line, never a toast; nothing here uses the accent.

type Step =
  | 'signIn'
  | 'register'
  | 'checkMail'
  | 'forgot'
  | 'forgotSent'
  | 'reset'
  | 'passwordSaved'
  | 'verifying'
  | 'verified'
  | 'linkExpired'
  | 'google'
  | 'signedIn'

const titles: Record<Step, TextKey> = {
  signIn: 'account',
  register: 'registerTitle',
  checkMail: 'checkMailTitle',
  forgot: 'forgotTitle',
  forgotSent: 'checkMailTitle',
  reset: 'resetTitle',
  passwordSaved: 'passwordSavedTitle',
  verifying: 'verifyingTitle',
  verified: 'verifiedTitle',
  linkExpired: 'linkExpiredTitle',
  google: 'account',
  signedIn: 'account',
}

/** The API's wait between verification mails; the button waits as long. */
const RESEND_WAIT = 60_000
const MIN_PASSWORD = 8

/**
 * A verification link is posted once per token, even if React runs the effect twice in
 * development, and is not aborted by closing the sheet: a token used by an aborted request
 * would come back as "this link no longer works".
 */
const verifications = new Map<string, Promise<ApiResult<void>>>()

function verifyOnce(token: string): Promise<ApiResult<void>> {
  let verification = verifications.get(token)
  if (!verification) {
    verification = apiRequest('/api/auth/verify-email', { body: { token } })
    verifications.set(token, verification)
  }
  return verification
}

/**
 * Only mounted while open, so every opening starts on the right step with nothing left over;
 * a mail link arriving while it is open starts it again on the link's step.
 */
export function AccountSheet() {
  const open = useAccountStore((state) => state.sheetOpen)
  const linkCount = useAccountStore((state) => state.linkCount)
  return open ? <AccountFlow key={linkCount} /> : null
}

function firstStep(link: { kind: 'verify' | 'reset' } | null, email: string | null): Step {
  if (link) return link.kind === 'verify' ? 'verifying' : 'reset'
  return email ? 'signedIn' : 'signIn'
}

function AccountFlow() {
  const t = useT()
  const language = useAppStore((state) => state.language)
  const account = useAccountStore((state) => state.email)
  const link = useAccountStore((state) => state.link)
  const sessionEnded = useAccountStore((state) => state.sessionEnded)
  const online = useOnline()

  const [step, setStep] = useState<Step>(() => firstStep(link, account))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState<'verify' | 'reset'>('verify')
  const [verifyAttempt, setVerifyAttempt] = useState(0)
  /** Prepared before the click: the Google window must open synchronously in it. */
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [googleHandoff, setGoogleHandoff] = useState<Handoff | null>(null)
  const requests = useRef<AbortController | null>(null)
  const [resendSeconds, startResendWait] = useCountdown()
  const opened = useRef(false)

  // A session the server ended while the sheet was open: back to signing in, quietly.
  const shown: Step = step === 'signedIn' && !account ? 'signIn' : step
  const canSend = online || shown === 'signedIn'

  // Closing the sheet aborts what it was waiting for.
  useEffect(() => {
    const controller = new AbortController()
    requests.current = controller
    return () => controller.abort()
  }, [])

  // Once per opening: wake Render while the user types (no plane), or renew a session that exists.
  // The renewal is not aborted by closing: if it finishes, the new token is saved instead of lost.
  useEffect(() => {
    if (opened.current || !navigator.onLine) return
    opened.current = true
    if (useAccountStore.getState().email) void loadMe()
    else void wakeApi()
  }, [])

  useEffect(() => {
    if (shown !== 'signIn' || handoff) return
    let live = true
    void newHandoff().then((prepared) => live && setHandoff(prepared))
    return () => {
      live = false
    }
  }, [shown, handoff])

  // A verification link is posted as the page opens; it never signs in.
  useEffect(() => {
    if (shown !== 'verifying' || !link || link.kind !== 'verify') return
    let live = true
    void verifyOnce(link.token).then((result) => {
      if (!live) return
      if (result.ok) {
        clearLink()
        setStep('verified')
      } else if (result.code === 'invalid_token') {
        clearLink()
        setExpired('verify')
        setStep('linkExpired')
      } else setError(result.code)
    })
    return () => {
      live = false
    }
  }, [shown, link, verifyAttempt])

  useGoogleWatch(shown === 'google' ? googleHandoff : null, {
    onDone: (tokens) => {
      signedIn(tokens)
      setGoogleHandoff(null)
      setStep('signedIn')
    },
    onFailed: (code) => {
      setGoogleHandoff(null)
      setError(code)
      setStep('signIn')
    },
  })

  const go = (next: Step) => {
    setError(null)
    setStep(next)
  }

  /** One request: the plane replaces the form until it answers, then the form comes back as typed. */
  const send = async <T,>(path: string, body: unknown): Promise<ApiResult<T>> => {
    setError(null)
    setPending(true)
    const result = await apiRequest<T>(path, { body, signal: requests.current?.signal })
    if (!result.ok && result.code === 'aborted') return result
    setPending(false)
    if (!result.ok) setError(result.code)
    return result
  }

  const passwordTooShort = (value: string) => {
    if (value.length >= MIN_PASSWORD) return false
    setError('password_short')
    return true
  }

  const signInWithPassword = async () => {
    const result = await send<Tokens>('/api/auth/login', { email, password })
    if (!result.ok) return
    signedIn(result.data)
    go('signedIn')
  }

  const register = async () => {
    if (passwordTooShort(password)) return
    if ((await send('/api/auth/register', { email, password, language })).ok) {
      startResendWait(RESEND_WAIT)
      go('checkMail')
    }
  }

  const resendVerification = async () => {
    if ((await send('/api/auth/resend-verification', { email, language })).ok) {
      startResendWait(RESEND_WAIT)
      go('checkMail')
    }
  }

  const askRecovery = async () => {
    if ((await send('/api/auth/forgot-password', { email, language })).ok) go('forgotSent')
  }

  const resetPassword = async () => {
    if (!link || passwordTooShort(newPassword)) return
    const result = await send('/api/auth/reset-password', { token: link.token, newPassword })
    if (result.ok) {
      clearLink()
      go('passwordSaved')
    } else if (result.code === 'invalid_token') {
      clearLink()
      setExpired('reset')
      go('linkExpired')
    }
  }

  const startGoogle = () => {
    if (!handoff) return
    // Synchronously in the click, before any state change: iOS and popup blockers need the gesture.
    openGoogleWindow(handoff, language)
    setGoogleHandoff(handoff)
    setHandoff(null)
    go('google')
  }

  const retryVerify = () => {
    if (link) verifications.delete(link.token)
    setError(null)
    setVerifyAttempt((attempt) => attempt + 1)
  }

  const errorLine = error && (
    <p role="alert" className="max-w-[52ch] rounded-xl bg-hover px-3 py-2.5 text-sm text-ink">
      {t(errorMessageKey(error))}
      {error === 'email_not_verified' && (
        <>
          {' '}
          <LinkButton onClick={() => void resendVerification()}>{t('sendMailAgain')}</LinkButton>
        </>
      )}
    </p>
  )

  const emailField = (
    <TextField label={t('email')} type="email" value={email} onChange={setEmail} autoComplete="email" />
  )
  const reveal = { show: t('showPassword'), hide: t('hidePassword') }

  return (
    <Sheet open onClose={closeAccount} title={t(titles[shown])} closeLabel={t('close')}>
      {pending ? (
        <div className="py-3">
          <PlaneWait />
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-1">
          {shown === 'signIn' && (
            <>
              <Intro>{t('accountIntro')}</Intro>
              {sessionEnded && <Note>{t('sessionEndedNote')}</Note>}
              {!online && <Note>{t('offlineNote')}</Note>}
              <div>
                <Button onClick={startGoogle} disabled={!canSend || !handoff}>
                  {t('continueWithGoogle')}
                </Button>
              </div>
              <Divider>{t('orWithEmail')}</Divider>
              <Form onSubmit={signInWithPassword}>
                {emailField}
                <TextField
                  label={t('password')}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  reveal={reveal}
                />
                {errorLine}
                <Actions>
                  <Button type="submit" variant="primary" disabled={!canSend}>
                    {t('signIn')}
                  </Button>
                </Actions>
              </Form>
              <Links>
                <LinkButton onClick={() => go('forgot')}>{t('forgotPassword')}</LinkButton>
                <LinkButton onClick={() => go('register')}>{t('createAccount')}</LinkButton>
              </Links>
              <PrivacyLink />
            </>
          )}

          {shown === 'register' && (
            <>
              <Intro>{t('registerIntro')}</Intro>
              {!online && <Note>{t('offlineNote')}</Note>}
              <Form onSubmit={register}>
                {emailField}
                <TextField
                  label={t('password')}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  hint={t('passwordHint')}
                  reveal={reveal}
                />
                {errorLine}
                <Actions>
                  <Button type="submit" variant="primary" disabled={!canSend}>
                    {t('register')}
                  </Button>
                </Actions>
              </Form>
              <Links>
                <LinkButton onClick={() => go('signIn')}>{t('haveAccount')}</LinkButton>
              </Links>
              <PrivacyLink />
            </>
          )}

          {shown === 'checkMail' && (
            <>
              <Intro>{t('checkMailBody', email.trim())}</Intro>
              {errorLine}
              <Actions>
                <Button onClick={() => void resendVerification()} disabled={resendSeconds > 0 || !canSend}>
                  {resendSeconds > 0 ? t('resendIn', resendSeconds) : t('resendMail')}
                </Button>
              </Actions>
              <Links>
                <LinkButton onClick={() => go('signIn')}>{t('backToSignIn')}</LinkButton>
              </Links>
            </>
          )}

          {shown === 'forgot' && (
            <>
              <Intro>{t('forgotIntro')}</Intro>
              {!online && <Note>{t('offlineNote')}</Note>}
              <Form onSubmit={askRecovery}>
                {emailField}
                {errorLine}
                <Actions>
                  <Button type="submit" variant="primary" disabled={!canSend}>
                    {t('sendLink')}
                  </Button>
                </Actions>
              </Form>
              <Links>
                <LinkButton onClick={() => go('signIn')}>{t('backToSignIn')}</LinkButton>
              </Links>
            </>
          )}

          {shown === 'forgotSent' && (
            <>
              <Intro>{t('forgotSentBody', email.trim())}</Intro>
              <Links>
                <LinkButton onClick={() => go('signIn')}>{t('backToSignIn')}</LinkButton>
              </Links>
            </>
          )}

          {shown === 'reset' && (
            <>
              <Intro>{t('resetIntro')}</Intro>
              {!online && <Note>{t('offlineNote')}</Note>}
              <Form onSubmit={resetPassword}>
                <TextField
                  label={t('newPassword')}
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  hint={t('passwordHint')}
                  reveal={reveal}
                />
                {errorLine}
                <Actions>
                  <Button type="submit" variant="primary" disabled={!canSend}>
                    {t('savePassword')}
                  </Button>
                </Actions>
              </Form>
            </>
          )}

          {shown === 'passwordSaved' && (
            <>
              <Intro>{t('passwordSavedBody')}</Intro>
              <Actions>
                <Button variant="primary" onClick={() => go('signIn')}>
                  {t('signIn')}
                </Button>
              </Actions>
            </>
          )}

          {shown === 'verifying' &&
            (error ? (
              <>
                {errorLine}
                <Actions>
                  <Button onClick={retryVerify}>{t('tryAgain')}</Button>
                </Actions>
              </>
            ) : (
              <div className="py-3">
                <PlaneWait />
              </div>
            ))}

          {shown === 'verified' && (
            <>
              <Intro>{t('verifiedBody')}</Intro>
              <Actions>
                <Button variant="primary" onClick={() => go('signIn')}>
                  {t('signIn')}
                </Button>
              </Actions>
            </>
          )}

          {shown === 'linkExpired' && expired === 'verify' && (
            <>
              <Intro>{t('verifyLinkExpiredBody')}</Intro>
              <Form onSubmit={resendVerification}>
                {emailField}
                {errorLine}
                <Actions>
                  <Button type="submit" disabled={!canSend}>
                    {t('sendNewLink')}
                  </Button>
                  <Button variant="primary" onClick={() => go('signIn')}>
                    {t('signIn')}
                  </Button>
                </Actions>
              </Form>
            </>
          )}

          {shown === 'linkExpired' && expired === 'reset' && (
            <>
              <Intro>{t('resetLinkExpiredBody')}</Intro>
              <Actions>
                <Button onClick={() => go('forgot')}>{t('askNewLink')}</Button>
              </Actions>
            </>
          )}

          {shown === 'google' && (
            <>
              <Note>{t('googleWaiting')}</Note>
              <Actions>
                <Button
                  onClick={() => {
                    setGoogleHandoff(null)
                    go('signIn')
                  }}
                >
                  {t('cancel')}
                </Button>
              </Actions>
            </>
          )}

          {shown === 'signedIn' && account && (
            <>
              <div>
                <p className="text-sm text-pencil">{t('signedInAs')}</p>
                <p className="font-display text-[19px] leading-snug font-semibold [overflow-wrap:anywhere]">{account}</p>
              </div>
              <Intro>{t('signOutNote')}</Intro>
              <Actions>
                <Button
                  onClick={() => {
                    signOut()
                    go('signIn')
                  }}
                >
                  {t('signOut')}
                </Button>
              </Actions>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}

function Intro({ children }: { children: ReactNode }) {
  return <p className="max-w-[52ch] text-sm text-ink-2">{children}</p>
}

function Note({ children }: { children: ReactNode }) {
  return <p className="max-w-[52ch] rounded-[14px] bg-hover px-3.5 py-3 text-sm text-ink">{children}</p>
}

/** A real form, so Enter submits and password managers recognize it; the request runs in `onSubmit`. */
function Form({ onSubmit, children }: { onSubmit: () => Promise<void>; children: ReactNode }) {
  return (
    <form
      noValidate
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        void onSubmit()
      }}
      className="flex flex-col gap-3"
    >
      {children}
    </form>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

function Links({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">{children}</div>
}

function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px] text-pencil before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">
      {children}
    </div>
  )
}

/** The brand's privacy page (public/privacidad.html), in a new tab; Google's consent screen links to it too. */
function PrivacyLink() {
  const t = useT()
  return (
    <a
      href={t('privacyUrl')}
      target="_blank"
      rel="noopener"
      className="self-start py-1 text-[12.5px] text-pencil underline decoration-rule underline-offset-[3px]"
    >
      {t('privacy')}
    </a>
  )
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer py-1 text-sm font-semibold text-ink-2 underline decoration-rule underline-offset-[3px]"
    >
      {children}
    </button>
  )
}
