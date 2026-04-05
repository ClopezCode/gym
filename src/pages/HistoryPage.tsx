import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatWorkoutDate } from '../lib/formatWorkoutDate'
import { listUserWorkouts } from '../services/workoutService'
import type { Workout } from '../types/workout'
import './HistoryPage.css'

export function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const result = await listUserWorkouts()
      if (cancelled) return
      if (result.ok) {
        setWorkouts(result.workouts)
      } else {
        setError(result.message)
      }
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="history-page">
      <header className="history-page__header">
        <h1 className="history-page__title">Historial</h1>
        <Link className="history-page__nav-link" to="/">
          ← Inicio
        </Link>
      </header>

      {isLoading ? (
        <p className="history-page__status" role="status">
          Cargando…
        </p>
      ) : null}

      {error ? (
        <p className="history-page__error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && workouts.length === 0 ? (
        <p className="history-page__empty">
          Sin entrenos guardados.
        </p>
      ) : null}

      {!isLoading && !error && workouts.length > 0 ? (
        <ul className="history-page__list">
          {workouts.map((w) => (
            <li key={w.id} className="history-page__item">
              <Link
                className="history-page__card"
                to={`/history/${w.id}`}
              >
                <span className="history-page__card-date">
                  {formatWorkoutDate(w.date)}
                </span>
                <span className="history-page__card-hint">Ver detalle →</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  )
}
