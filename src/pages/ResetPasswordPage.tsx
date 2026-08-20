import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../hooks/useAuth'
import visionLogo from '../assets/Vision.png'
// Comparte la presentación con la pantalla de acceso.
import './LoginPage.css'

const MIN_PASSWORD_LENGTH = 6

export function ResetPasswordPage() {
  const { user, isLoading, updatePassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      return
    }
    if (password !== confirmation) {
      setErrorMessage('Las dos contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      const err = await updatePassword(password)
      if (err) {
        setErrorMessage(err.message)
        return
      }
      setIsDone(true)
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
        <p className="login-page__subtitle">Nueva contraseña</p>
      </header>

      {isLoading ? (
        <p className="login-form__info" role="status">
          Comprobando el enlace…
        </p>
      ) : !user ? (
        <div className="login-form">
          <p className="login-form__hint">
            Este enlace no es válido o ya ha caducado. Pide uno nuevo desde la
            pantalla de acceso.
          </p>
          <Link className="login-page__link" to="/login">
            ← Ir a acceder
          </Link>
        </div>
      ) : isDone ? (
        <div className="login-form">
          <p className="login-form__info" role="status">
            Contraseña actualizada. Ya puedes usar la app con tu sesión actual.
          </p>
          <Link className="login-page__link" to="/">
            Ir a la app →
          </Link>
        </div>
      ) : (
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <p className="login-form__hint">
            Elige una contraseña nueva para <strong>{user.email}</strong>.
          </p>

          <PasswordField
            id="new-password"
            label="Contraseña nueva"
            labelClassName="login-form__label"
            inputClassName="login-form__input"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={setPassword}
            disabled={isSubmitting}
            invalid={Boolean(errorMessage)}
            describedBy={errorMessage ? 'reset-error' : undefined}
          />

          <PasswordField
            id="confirm-password"
            label="Repite la contraseña"
            labelClassName="login-form__label"
            inputClassName="login-form__input"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmation}
            onChange={setConfirmation}
            disabled={isSubmitting}
            invalid={Boolean(errorMessage)}
          />

          {errorMessage ? (
            <p id="reset-error" className="login-form__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="login-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}
