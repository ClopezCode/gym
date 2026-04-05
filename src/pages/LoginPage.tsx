import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import visionLogo from '../assets/Vision.png'
import './LoginPage.css'

type AuthMode = 'login' | 'signup'

type LocationState = { from?: { pathname: string } }

export function LoginPage() {
  const { user, isLoading, signIn, signUp } = useAuth()
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
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
        <p className="login-page__subtitle">
          {mode === 'login' ? 'Accede a tu cuenta' : 'Registro rápido'}
        </p>
      </header>

      <div className="login-page__tabs" role="tablist" aria-label="Modo de acceso">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`login-page__tab ${mode === 'login' ? 'login-page__tab--active' : ''}`}
          onClick={() => {
            setMode('login')
            setErrorMessage(null)
            setInfoMessage(null)
          }}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`login-page__tab ${mode === 'signup' ? 'login-page__tab--active' : ''}`}
          onClick={() => {
            setMode('signup')
            setErrorMessage(null)
            setInfoMessage(null)
          }}
        >
          Registro
        </button>
      </div>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
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

        <label className="login-form__label" htmlFor="auth-password">
          Contraseña
        </label>
        <input
          id="auth-password"
          className="login-form__input"
          type="password"
          name="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
        />

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
          {isSubmitting
            ? 'Procesando…'
            : mode === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
        </button>
      </form>

      <p className="login-page__footer">
        <Link className="login-page__link" to="/">
          Inicio
        </Link>
      </p>
    </div>
  )
}
