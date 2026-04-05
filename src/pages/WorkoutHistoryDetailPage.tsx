import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatWorkoutDate } from '../lib/formatWorkoutDate'
import { groupSetsByExercise } from '../lib/groupSetsByExercise'
import { getSetsForWorkout } from '../services/setService'
import { getWorkoutById } from '../services/workoutService'
import type { Workout } from '../types/workout'
import type { WorkoutSetWithExercise } from '../types/workoutSet'
import './WorkoutHistoryDetailPage.css'

export function WorkoutHistoryDetailPage() {
  const { workoutId } = useParams<{ workoutId: string }>()

  const [workout, setWorkout] = useState<Workout | null>(null)
  const [sets, setSets] = useState<WorkoutSetWithExercise[]>([])
  const [isLoading, setIsLoading] = useState(() => Boolean(workoutId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workoutId) {
      return
    }

    let cancelled = false

    void (async () => {
      setIsLoading(true)
      setError(null)

      const workoutResult = await getWorkoutById(workoutId)
      if (cancelled) return

      if (!workoutResult.ok) {
        setError(workoutResult.message)
        setWorkout(null)
        setSets([])
        setIsLoading(false)
        return
      }

      const setsResult = await getSetsForWorkout(workoutId)
      if (cancelled) return

      if (!setsResult.ok) {
        setError(setsResult.message)
        setWorkout(workoutResult.workout)
        setSets([])
      } else {
        setWorkout(workoutResult.workout)
        setSets(setsResult.sets)
      }

      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [workoutId])

  if (!workoutId) {
    return (
      <main className="workout-history-detail">
        <p className="workout-history-detail__error" role="alert">
          Entreno no válido.
        </p>
        <Link className="workout-history-detail__back" to="/history">
          ← Historial
        </Link>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="workout-history-detail">
        <p className="workout-history-detail__status" role="status">
          Cargando…
        </p>
      </main>
    )
  }

  if (error || !workout) {
    return (
      <main className="workout-history-detail">
        <p className="workout-history-detail__error" role="alert">
          {error ?? 'No se pudo cargar el entreno.'}
        </p>
        <Link className="workout-history-detail__back" to="/history">
          ← Historial
        </Link>
      </main>
    )
  }

  const groups = groupSetsByExercise(sets)

  return (
    <main className="workout-history-detail">
      <header className="workout-history-detail__header">
        <div>
          <h1 className="workout-history-detail__title">Detalle</h1>
          <p className="workout-history-detail__meta">
            {formatWorkoutDate(workout.date)}
          </p>
        </div>
        <Link className="workout-history-detail__back" to="/history">
          ← Historial
        </Link>
      </header>

      {groups.length === 0 ? (
        <p className="workout-history-detail__empty">Sin series en este entreno.</p>
      ) : (
        <ul className="workout-history-detail__exercise-list">
          {groups.map((g) => (
            <li key={g.exerciseId} className="workout-history-detail__exercise">
              <h2 className="workout-history-detail__exercise-name">
                {g.exerciseId !== '_' ? (
                  <Link
                    className="workout-history-detail__exercise-link"
                    to={`/exercises/${g.exerciseId}`}
                  >
                    {g.exerciseName}
                  </Link>
                ) : (
                  g.exerciseName
                )}
              </h2>
              <ol className="workout-history-detail__sets">
                {g.sets.map((s, index) => (
                  <li
                    key={s.id}
                    className="workout-history-detail__set-line"
                  >
                    <span className="workout-history-detail__set-n">
                      {index + 1}
                    </span>
                    <span className="workout-history-detail__set-values">
                      {s.weight} kg × {s.reps}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
