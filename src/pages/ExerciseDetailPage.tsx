import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ExerciseSessionVolumePoint } from '../lib/statsAggregates'
import { formatSetDisplay } from '../lib/formatSetDisplay'
import { formatWorkoutDate } from '../lib/formatWorkoutDate'
import { getExercisePerformanceDetail } from '../services/exerciseService'
import { getExerciseVolumeBySession } from '../services/statsService'
import type { Exercise } from '../types/exercise'
import type { ExerciseSetHistoryEntry } from '../types/exercisePerformance'
import './ExerciseDetailPage.css'

export function ExerciseDetailPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [history, setHistory] = useState<ExerciseSetHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(() => Boolean(exerciseId))
  const [error, setError] = useState<string | null>(null)
  const [volumeSeries, setVolumeSeries] = useState<ExerciseSessionVolumePoint[]>(
    [],
  )
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    if (!exerciseId) {
      return
    }

    let cancelled = false

    void (async () => {
      setIsLoading(true)
      setError(null)

      const result = await getExercisePerformanceDetail(exerciseId)
      if (cancelled) return

      if (!result.ok) {
        setError(result.message)
        setExercise(null)
        setHistory([])
      } else {
        setExercise(result.exercise)
        setHistory(result.history)
      }

      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [exerciseId])

  useEffect(() => {
    if (!exerciseId) return
    let cancelled = false
    void (async () => {
      setChartLoading(true)
      const res = await getExerciseVolumeBySession(exerciseId, 12)
      if (cancelled) return
      if (res.ok) {
        setVolumeSeries(res.data)
      } else {
        setVolumeSeries([])
      }
      setChartLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [exerciseId])

  const lastEntry = history[0]

  if (!exerciseId) {
    return (
      <main className="exercise-detail">
        <p className="exercise-detail__error" role="alert">
          Ejercicio no válido.
        </p>
        <Link className="exercise-detail__back" to="/">
          ← Inicio
        </Link>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="exercise-detail">
        <p className="exercise-detail__status" role="status">
          Cargando…
        </p>
      </main>
    )
  }

  if (error || !exercise) {
    return (
      <main className="exercise-detail">
        <p className="exercise-detail__error" role="alert">
          {error ?? 'No se pudo cargar el ejercicio.'}
        </p>
        <Link className="exercise-detail__back" to="/history">
          ← Historial
        </Link>
      </main>
    )
  }

  return (
    <main className="exercise-detail">
      <header className="exercise-detail__header">
        <div>
          <h1 className="exercise-detail__title">{exercise.name}</h1>
          <p className="exercise-detail__subtitle">Series</p>
        </div>
        <div className="exercise-detail__header-links">
          <Link className="exercise-detail__back" to="/progress">
            Progreso
          </Link>
          <Link className="exercise-detail__back" to="/history">
            ← Historial
          </Link>
        </div>
      </header>

      {lastEntry ? (
        <section
          className="exercise-detail__last"
          aria-labelledby="last-performance-heading"
        >
          <h2 id="last-performance-heading" className="exercise-detail__last-label">
            Última vez
          </h2>
          <p className="exercise-detail__last-value">
            {formatSetDisplay(lastEntry.weight, lastEntry.reps)}
          </p>
          <p className="exercise-detail__last-meta">
            {formatWorkoutDate(lastEntry.workout_date)}
          </p>
        </section>
      ) : (
        <section className="exercise-detail__last exercise-detail__last--empty">
          <p className="exercise-detail__empty-lead">
            Sin series aún. Al guardar un entreno verás la última carga y el
            historial.
          </p>
        </section>
      )}

      {history.length > 0 ? (
        <section
          className="exercise-detail__history"
          aria-labelledby="history-heading"
        >
          <h2 id="history-heading" className="exercise-detail__history-title">
            Historial de series
          </h2>
          <p className="exercise-detail__history-hint">Más reciente arriba.</p>
          <ol className="exercise-detail__history-list">
            {history.map((entry, index) => (
              <li key={entry.id} className="exercise-detail__history-row">
                <span className="exercise-detail__history-n" aria-hidden>
                  {index + 1}
                </span>
                <div className="exercise-detail__history-main">
                  <span className="exercise-detail__history-set">
                    {formatSetDisplay(entry.weight, entry.reps)}
                  </span>
                  <span className="exercise-detail__history-date">
                    {formatWorkoutDate(entry.workout_date)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section
        className="exercise-detail__chart-section"
        aria-labelledby="volume-chart-heading"
      >
        <h2 id="volume-chart-heading" className="exercise-detail__history-title">
          Volumen por sesión
        </h2>
        <p className="exercise-detail__history-hint">
          kg × reps por sesión (últimas).
        </p>
        {chartLoading ? (
          <p className="exercise-detail__status">Cargando…</p>
        ) : volumeSeries.length === 0 ? (
          <p className="exercise-detail__history-hint">
            Sin datos de sesiones todavía.
          </p>
        ) : (
          <div className="exercise-detail__chart" role="img" aria-hidden>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={volumeSeries}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text)', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text)', fontSize: 11 }}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value) => {
                    const n =
                      typeof value === 'number' ? value : Number(value)
                    const t = Number.isFinite(n) ? Math.round(n) : 0
                    return [`${t} kg·rep`, 'Volumen']
                  }}
                  contentStyle={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--accent)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </main>
  )
}
