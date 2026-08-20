import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../hooks/useAuth'
import visionLogo from '../assets/Vision.png'
import './LoginPage.css'

type AuthMode = 'login' | 'signup' | 'recover'

type LocationState = { from?: { pathname: string } }

const SUBTITLES: Record<AuthMode, string> = {
  login: 'Accede a tu cuenta',
  signup: 'Registro rápido',
  recover: 'Recuperar contraseña',
}

export function LoginPage() {
  const { user, isLoading, signIn, signUp, requestPasswordReset } = useAuth()
  const location = useLocation()
  const from =
    (location.state as LocationState | null)?.from?.pathname ?? '/'

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate to={from} replace />
  }

  function switchMode(next: AuthMode) {
    setMode(next)
    setErrorMessage(null)
    setInfoMessage(null)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === 'recover') {
        const err = await requestPasswordReset(email.trim())
        if (err) {
          setErrorMessage(err.message)
        } else {
          setInfoMessage(
            'Si ese correo tiene cuenta, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.',
          )
        }
      } else if (mode === 'login') {
        const err = await signIn(email.trim(), password)
        if (err) {
          setErrorMessage(err.message)
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp(
          email.trim(),
          password,
        )
        if (error) {
          setErrorMessage(error.message)
        } else if (needsEmailConfirmation) {
          setInfoMessage('Cuenta creada. Confirma el correo para entrar.')
          setPassword('')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitLabel =
    mode === 'login'
      ? 'Entrar'
      : mode === 'signup'
        ? 'Crear cuenta'
        : 'Enviar enlace'

  return (
    <div className="login-page">
      <header className="login-page__header">
        <img
          className="login-page__logo"
          src={visionLogo}
          alt=""
          width={96}
          height={96}
          decoding="async"
        />
        <h1 className="login-page__title">Gym</h1>
        <p className="login-page__subtitle">{SUBTITLES[mode]}</p>
      </header>

      {mode === 'recover' ? null : (
        <div
          className="login-page__tabs"
          role="tablist"
          aria-label="Modo de acceso"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`login-page__tab ${mode === 'login' ? 'login-page__tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`login-page__tab ${mode === 'signup' ? 'login-page__tab--active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Registro
          </button>
        </div>
      )}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {mode === 'recover' ? (
          <p className="login-form__hint">
            Escribe el correo de tu cuenta y te enviaremos un enlace para
            establecer una contraseña nueva.
          </p>
        ) : null}

        <label className="login-form__label" htmlFor="auth-email">
          Correo
        </label>
        <input
          id="auth-email"
          className="login-form__input"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? 'auth-error' : undefined}
        />

        {mode === 'recover' ? null : (
          <PasswordField
            id="auth-password"
            label="Contraseña"
            labelClassName="login-form__label"
            inputClassName="login-form__input"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={setPassword}
            disabled={isSubmitting}
          />
        )}

        {errorMessage ? (
          <p id="auth-error" className="login-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {infoMessage ? (
          <p className="login-form__info" role="status">
            {infoMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="login-form__submit"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? 'Procesando…' : submitLabel}
        </button>

        {mode === 'login' ? (
          <button
            type="button"
            className="login-form__text-button"
            onClick={() => switchMode('recover')}
          >
            ¿Olvidaste tu contraseña?
          </button>
        ) : null}

        {mode === 'recover' ? (
          <button
            type="button"
            className="login-form__text-button"
            onClick={() => switchMode('login')}
          >
            ← Volver a entrar
          </button>
        ) : null}
      </form>

      <p className="login-page__footer">
        <Link className="login-page__link" to="/">
          Inicio
        </Link>
      </p>
    </div>
  )
}
