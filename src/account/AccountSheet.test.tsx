import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSession, saveSession } from '../lib/storage'
import { useAppStore } from '../store/appStore'
import { resetStores } from '../test/stores'
import { apiRequest, wakeApi, type ApiResult, type RequestOptions } from './api'
import { AccountSheet } from './AccountSheet'
import accountSheetSource from './AccountSheet.tsx?raw'
import { initialAccountState, openAccount, openWithLink, useAccountStore, type Tokens } from './accountStore'
import { GOOGLE_LIMIT, POLL_EVERY } from './google'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  apiRequest: vi.fn(),
  wakeApi: vi.fn(async () => true),
}))

const request = vi.mocked(apiRequest)
const tokens: Tokens = { accessToken: 'jwt', accessTokenExpiresAt: '2026-11-02T12:15:00Z', refreshToken: 'rt-1', email: 'gian@example.com' }

/** Answers each API path; anything not listed never answers. */
function answer(routes: Record<string, ApiResult<unknown> | (() => Promise<ApiResult<unknown>>)>) {
  request.mockImplementation(async (path: string) => {
    const route = routes[path]
    if (!route) return new Promise(() => {})
    return typeof route === 'function' ? route() : route
  })
}

const calls = (path: string) => request.mock.calls.filter(([called]) => called === path).map(([, options]) => options as RequestOptions)

function open(link?: Parameters<typeof openWithLink>[0]) {
  if (link) openWithLink(link)
  else openAccount()
  return render(
    <StrictMode>
      <AccountSheet />
    </StrictMode>,
  )
}

const sheet = () => screen.getByRole('dialog')

async function signInWith(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Contraseña'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('AccountSheet', () => {
  beforeEach(() => {
    resetStores()
    request.mockReset()
    vi.mocked(wakeApi).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('signing in', () => {
    it('offers Google and email with fields marked for password managers', async () => {
      open()

      expect(screen.getByRole('dialog', { name: 'Cuenta' })).toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeEnabled()
      expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
      expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'current-password')
      expect(screen.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument()
    })

    it('links the privacy page in a new tab, in the language MTF is in', async () => {
      open()
      const privacy = screen.getByRole('link', { name: 'Privacidad' })
      expect(privacy).toHaveAttribute('href', '/privacidad.html')
      expect(privacy).toHaveAttribute('target', '_blank')

      act(() => useAppStore.setState({ language: 'en' }))
      expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacidad.html#en')
    })

    it('wakes the API as it opens, with no plane while the user types', async () => {
      open()
      await userEvent.type(screen.getByLabelText('Email'), 'gian@')

      expect(wakeApi).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(request).not.toHaveBeenCalled()
    })

    it('signs in and shows the account’s email', async () => {
      answer({ '/api/auth/login': { ok: true, data: tokens } })
      open()

      await signInWith('gian@example.com', 'secreto123')

      expect(calls('/api/auth/login')[0].body).toEqual({ email: 'gian@example.com', password: 'secreto123' })
      expect(await screen.findByText('gian@example.com')).toBeInTheDocument()
      expect(screen.getByText('Entraste como')).toBeInTheDocument()
      expect(loadSession()).toEqual({ refreshToken: 'rt-1', email: 'gian@example.com' })
    })

    it.each([
      ['invalid_credentials', 'El email o la contraseña no coinciden.'],
      ['too_many_requests', 'Hiciste muchos intentos. Probá de nuevo en un minuto.'],
      ['timeout', 'No pudimos conectar ahora. Tu escritorio sigue funcionando; probá en un rato.'],
      ['network', 'Algo salió mal. Probá de nuevo en un rato.'],
      ['server_error', 'Algo salió mal. Probá de nuevo en un rato.'],
    ])('says %s in Spanish, whatever the server wrote, and keeps what was typed', async (code, message) => {
      answer({ '/api/auth/login': { ok: false, code, status: 400 } })
      open()

      await signInWith('gian@example.com', 'secreto123')

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(screen.getByLabelText('Email')).toHaveValue('gian@example.com')
      expect(screen.getByLabelText('Contraseña')).toHaveValue('secreto123')
    })

    it('says the same in English when MTF is in English', async () => {
      useAppStore.setState({ language: 'en' })
      answer({ '/api/auth/login': { ok: false, code: 'invalid_credentials', status: 401 } })
      open()

      await userEvent.type(screen.getByLabelText('Email'), 'gian@example.com')
      await userEvent.type(screen.getByLabelText('Password'), 'secreto123')
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

      expect(await screen.findByRole('alert')).toHaveTextContent("The email or the password doesn't match.")
    })

    it('replaces the form with the plane while waiting, and brings it back as typed after a timeout', async () => {
      let finish: (result: ApiResult<unknown>) => void = () => {}
      answer({ '/api/auth/login': () => new Promise((resolve) => (finish = resolve)) })
      open()

      await signInWith('gian@example.com', 'secreto123')

      expect(screen.getByRole('status')).toHaveTextContent('Entrando…')
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()

      await act(async () => finish({ ok: false, code: 'timeout' }))

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toHaveValue('gian@example.com')
      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos conectar ahora.')
    })

    it('an unverified email asks to confirm and can send the mail again', async () => {
      answer({
        '/api/auth/login': { ok: false, code: 'email_not_verified', status: 403 },
        '/api/auth/resend-verification': { ok: true, data: undefined },
      })
      open()
      await signInWith('gian@example.com', 'secreto123')

      expect(await screen.findByRole('alert')).toHaveTextContent('Confirmá tu email para entrar.')
      await userEvent.click(screen.getByRole('button', { name: 'Mandar el mail de nuevo' }))

      expect(calls('/api/auth/resend-verification')[0].body).toEqual({ email: 'gian@example.com', language: 'es' })
      expect(await screen.findByRole('dialog', { name: 'Revisá tu mail' })).toBeInTheDocument()
    })

    it('with no connection says signing in needs one, sends nothing and wakes nothing', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      open()

      expect(screen.getByText(/Para entrar necesitás conexión/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
      expect(wakeApi).not.toHaveBeenCalled()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('after the server ended the session, invites to sign in again, saying the Desk is still here', () => {
      useAccountStore.setState({ sessionEnded: true })
      open()

      expect(screen.getByText('Tu sesión terminó. Entrá de nuevo cuando quieras: tu escritorio sigue acá.')).toBeInTheDocument()
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
    })

    it('no step uses the accent', () => {
      expect(accountSheetSource).not.toMatch(/(bg|text|border|ring|fill|stroke|decoration|outline)-accent/)
    })

    it('never uses the accent', async () => {
      open()
      await screen.findByRole('button', { name: 'Continuar con Google' })

      expect(sheet().outerHTML).not.toMatch(/accent/)
    })
  })

  describe('registering', () => {
    it('refuses a short password before sending anything', async () => {
      open()
      await userEvent.click(screen.getByRole('button', { name: 'Crear una cuenta' }))
      await userEvent.type(screen.getByLabelText('Email'), 'gian@example.com')
      await userEvent.type(screen.getByLabelText('Contraseña'), '1234567')
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

      expect(screen.getByRole('alert')).toHaveTextContent('La contraseña necesita al menos 8 caracteres.')
      expect(request).not.toHaveBeenCalled()
    })

    it('marks the password as new, sends the language, and asks to check the mail', async () => {
      answer({ '/api/auth/register': { ok: true, data: undefined } })
      open()
      await userEvent.click(screen.getByRole('button', { name: 'Crear una cuenta' }))
      expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'new-password')
      await userEvent.type(screen.getByLabelText('Email'), 'gian@example.com')
      await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123')
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

      expect(calls('/api/auth/register')[0].body).toEqual({ email: 'gian@example.com', password: 'secreto123', language: 'es' })
      expect(await screen.findByRole('dialog', { name: 'Revisá tu mail' })).toHaveTextContent('gian@example.com')
    })

    it('the resend button waits 60 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      answer({ '/api/auth/register': { ok: true, data: undefined }, '/api/auth/resend-verification': { ok: true, data: undefined } })
      open()
      await user.click(screen.getByRole('button', { name: 'Crear una cuenta' }))
      await user.type(screen.getByLabelText('Email'), 'gian@example.com')
      await user.type(screen.getByLabelText('Contraseña'), 'secreto123')
      await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

      expect(await screen.findByRole('button', { name: 'Reenviar en 60 s' })).toBeDisabled()
      await act(async () => vi.advanceTimersByTime(60_000))
      await user.click(screen.getByRole('button', { name: 'Reenviar el mail' }))

      expect(calls('/api/auth/resend-verification')).toHaveLength(1)
      expect(await screen.findByRole('button', { name: 'Reenviar en 60 s' })).toBeDisabled()
    })
  })

  describe('recovering the password', () => {
    it('asks for a recovery mail and says the same whether or not the account exists', async () => {
      answer({ '/api/auth/forgot-password': { ok: true, data: undefined } })
      open()
      await userEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))
      await userEvent.type(screen.getByLabelText('Email'), 'gian@example.com')
      await userEvent.click(screen.getByRole('button', { name: 'Mandar enlace' }))

      expect(calls('/api/auth/forgot-password')[0].body).toEqual({ email: 'gian@example.com', language: 'es' })
      expect(await screen.findByText(/Si hay una cuenta con gian@example.com/)).toBeInTheDocument()
    })
  })

  describe('mail links', () => {
    it('a verification link opens on its step, posts once as it opens, and does not sign in', async () => {
      answer({ '/api/auth/verify-email': { ok: true, data: undefined } })
      open({ kind: 'verify', token: 'verify-token' })

      expect(await screen.findByRole('dialog', { name: 'Email confirmado' })).toBeInTheDocument()
      expect(calls('/api/auth/verify-email')).toEqual([{ body: { token: 'verify-token' } }])
      expect(loadSession()).toBeNull()
      expect(useAccountStore.getState()).toMatchObject({ email: null, link: null })
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      expect(screen.getByRole('dialog', { name: 'Cuenta' })).toBeInTheDocument()
    })

    it('a used or expired verification link says so and offers a new one', async () => {
      answer({
        '/api/auth/verify-email': { ok: false, code: 'invalid_token', status: 400 },
        '/api/auth/resend-verification': { ok: true, data: undefined },
      })
      open({ kind: 'verify', token: 'old-token' })

      expect(await screen.findByRole('dialog', { name: 'Este enlace ya no funciona' })).toHaveTextContent(
        'Si ya confirmaste tu email, entrá directamente.',
      )
      await userEvent.type(screen.getByLabelText('Email'), 'gian@example.com')
      await userEvent.click(screen.getByRole('button', { name: 'Mandar uno nuevo' }))
      expect(await screen.findByRole('dialog', { name: 'Revisá tu mail' })).toBeInTheDocument()
    })

    it('a recovery link asks for a new password and saves it with the token, without signing in', async () => {
      answer({ '/api/auth/reset-password': { ok: true, data: undefined } })
      open({ kind: 'reset', token: 'reset-token' })

      expect(screen.getByRole('dialog', { name: 'Elegí una contraseña nueva' })).toBeInTheDocument()
      expect(screen.getByLabelText('Contraseña nueva')).toHaveAttribute('autocomplete', 'new-password')
      await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'nueva-clave-1')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

      expect(calls('/api/auth/reset-password')).toEqual([{ body: { token: 'reset-token', newPassword: 'nueva-clave-1' }, signal: expect.any(AbortSignal) }])
      expect(await screen.findByRole('dialog', { name: 'Contraseña guardada' })).toBeInTheDocument()
      expect(loadSession()).toBeNull()
    })

    it('an expired recovery link changes nothing and offers another', async () => {
      answer({ '/api/auth/reset-password': { ok: false, code: 'invalid_token', status: 400 } })
      open({ kind: 'reset', token: 'old-token' })
      await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'nueva-clave-1')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

      expect(await screen.findByText('Venció o ya se usó. Tu contraseña no cambió.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Pedir otro enlace' }))
      expect(screen.getByRole('dialog', { name: 'Recuperar contraseña' })).toBeInTheDocument()
    })
  })

  describe('Google', () => {
    it('opens Google’s window in the click and waits with a message and Cancel', async () => {
      const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null)
      open()

      await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }))

      expect(windowOpen).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/google\/login\?handoff=[A-Za-z0-9_-]{43}&lang=es$/), '_blank')
      expect(sheet()).toHaveTextContent('Seguí en la ventana de Google.')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('shows the account once Google hands the session over', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.spyOn(window, 'open').mockReturnValue(null)
      answer({ '/api/auth/google/exchange': { ok: true, data: tokens } })
      open()

      await user.click(await screen.findByRole('button', { name: 'Continuar con Google' }))
      await act(async () => vi.advanceTimersByTime(POLL_EVERY))

      expect(await screen.findByText('gian@example.com')).toBeInTheDocument()
      expect(loadSession()?.email).toBe('gian@example.com')
    })

    it('stops waiting after 5 minutes and says it could not sign in', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vi.spyOn(window, 'open').mockReturnValue(null)
      answer({ '/api/auth/google/exchange': { ok: true, data: undefined } })
      open()

      await user.click(await screen.findByRole('button', { name: 'Continuar con Google' }))
      await act(async () => vi.advanceTimersByTime(GOOGLE_LIMIT + POLL_EVERY))

      expect(await screen.findByRole('alert')).toHaveTextContent('pasaron 5 minutos sin respuesta')
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })
  })

  describe('signed in', () => {
    beforeEach(() => {
      saveSession({ refreshToken: 'rt-1', email: 'gian@example.com' })
      useAccountStore.setState(initialAccountState(), true)
    })

    it('shows the email, says the notes stay, and renews the session as it opens', async () => {
      answer({ '/api/auth/refresh': { ok: true, data: tokens }, '/api/auth/me': { ok: true, data: { email: 'gian@example.com' } } })
      open()

      expect(within(sheet()).getByText('gian@example.com')).toBeInTheDocument()
      expect(sheet()).toHaveTextContent('Si salís, tus notas se quedan en este dispositivo.')
      await waitFor(() => expect(calls('/api/auth/me')).toHaveLength(1))
      expect(wakeApi).not.toHaveBeenCalled()
    })

    it('signs out with no connection at once, with no error', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      open()

      await userEvent.click(screen.getByRole('button', { name: 'Salir' }))

      expect(loadSession()).toBeNull()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(calls('/api/auth/logout')).toHaveLength(0)
    })

    it('when the server says the session ended, quietly invites to sign in again', async () => {
      answer({ '/api/auth/refresh': { ok: false, code: 'session_ended', status: 401 } })
      open()

      expect(await screen.findByText(/Tu sesión terminó/)).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
    })
  })
})

describe('AccountSheet with a link arriving while open', () => {
  beforeEach(() => {
    resetStores()
    request.mockReset()
  })

  it('switches to the link’s step', async () => {
    answer({ '/api/auth/verify-email': { ok: true, data: undefined } })
    open()
    expect(screen.getByRole('dialog', { name: 'Cuenta' })).toBeInTheDocument()

    act(() => openWithLink({ kind: 'verify', token: 'late-token' }))

    expect(await screen.findByRole('dialog', { name: 'Email confirmado' })).toBeInTheDocument()
  })
})
