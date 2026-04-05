import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createWorkout } from '../services/workoutService'
import visionLogo from '../assets/Vision.png'
import './HomePage.css'

export function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [isCreatingWorkout, setIsCreatingWorkout] = useState(false)
  const [workoutError, setWorkoutError] = useState<string | null>(null)

  async function handleSignOut() {
    setSignOutError(null)
    setIsSigningOut(true)
    try {
      const err = await signOut()
      if (err) {
        setSignOutError(err.message)
      }
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handleNewWorkout() {
    setWorkoutError(null)
    setIsCreatingWorkout(true)
    try {
      const result = await createWorkout()
      if (result.ok) {
        navigate(`/workouts/${result.workout.id}`)
      } else {
        setWorkoutError(result.message)
      }
    } finally {
      setIsCreatingWorkout(false)
    }
  }

  return (
    <main className="home-page">
      <div className="home-page__signout-corner">
        <button
          type="button"
          className="home-page__signout-x"
          onClick={handleSignOut}
          disabled={isSigningOut}
          aria-label={isSigningOut ? 'Cerrando sesión' : 'Cerrar sesión'}
        >
          {isSigningOut ? (
            <span className="home-page__signout-spinner" aria-hidden />
          ) : (
            <svg
              className="home-page__signout-icon"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                d="M18 6L6 18M6 6l12 12"
              />
            </svg>
          )}
        </button>
        <span className="home-page__signout-tooltip" aria-hidden>
          {isSigningOut ? 'Cerrando…' : 'Cerrar sesión'}
        </span>
      </div>

      <header className="home-page__header">
        <div className="home-page__brand">
          <img
            className="home-page__logo"
            src={visionLogo}
            alt=""
            width={52}
            height={52}
            decoding="async"
          />
          <div className="home-page__brand-text">
            <h1 className="home-page__title">Gym</h1>
            <p className="home-page__welcome">
              Conectado{' '}
              <strong className="home-page__email">{user?.email}</strong>
            </p>
          </div>
        </div>
        <div className="home-page__header-actions">
          <Link className="home-page__history-link" to="/progress">
            Progreso
          </Link>
          <Link className="home-page__history-link" to="/routines">
            Plantillas
          </Link>
          <Link className="home-page__history-link" to="/history">
            Historial
          </Link>
        </div>
      </header>

      <section className="home-page__actions" aria-labelledby="workouts-heading">
        <h2 id="workouts-heading" className="home-page__section-title">
          Entrenos
        </h2>
        <button
          type="button"
          className="home-page__primary"
          onClick={handleNewWorkout}
          disabled={isCreatingWorkout}
        >
          {isCreatingWorkout ? 'Creando…' : 'Nuevo entreno'}
        </button>
        {workoutError ? (
          <p className="home-page__error" role="alert">
            {workoutError}
          </p>
        ) : null}
      </section>

      {signOutError ? (
        <p className="home-page__error home-page__error--footer" role="alert">
          {signOutError}
        </p>
      ) : null}
    </main>
  )
}
