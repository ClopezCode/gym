import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  ExerciseSessionVolumePoint,
  WeeklyVolumePoint,
} from '../lib/statsAggregates'
import { listUserExercises } from '../services/exerciseService'
import {
  getExerciseVolumeBySession,
  getWeeklyVolumeStats,
} from '../services/statsService'
import type { Exercise } from '../types/exercise'
import './ProgressPage.css'

const WEEKS = 8
const SESSION_POINTS = 12

function volumeTooltipFormatter(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) {
    return ['—', 'Volumen']
  }
  return [`${Math.round(n)} kg·rep`, 'Volumen']
}

export function ProgressPage() {
  const [weekly, setWeekly] = useState<WeeklyVolumePoint[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [exerciseSeries, setExerciseSeries] = useState<ExerciseSessionVolumePoint[]>(
    [],
  )
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true)
  const [isLoadingExercises, setIsLoadingExercises] = useState(true)
  const [isLoadingSeries, setIsLoadingSeries] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setIsLoadingWeekly(true)
      setError(null)
      const res = await getWeeklyVolumeStats(WEEKS)
      if (cancelled) return
      if (!res.ok) {
        setError(res.message)
        setWeekly([])
      } else {
        setWeekly(res.data)
      }
      setIsLoadingWeekly(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setIsLoadingExercises(true)
      const res = await listUserExercises()
      if (cancelled) return
      if (res.ok) {
        setExercises(res.exercises)
        setSelectedExerciseId((prev) =>
          prev || (res.exercises[0]?.id ?? ''),
        )
      }
      setIsLoadingExercises(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!selectedExerciseId) {
        setExerciseSeries([])
        setIsLoadingSeries(false)
        return
      }
      setIsLoadingSeries(true)
      const res = await getExerciseVolumeBySession(
        selectedExerciseId,
        SESSION_POINTS,
      )
      if (cancelled) return
      if (!res.ok) {
        setExerciseSeries([])
      } else {
        setExerciseSeries(res.data)
      }
      setIsLoadingSeries(false)
    })()
    return () => {
      cancelled = true
    }
  }, [selectedExerciseId])

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId)

  return (
    <main className="progress-page">
      <header className="progress-page__header">
        <div>
          <h1 className="progress-page__title">Progreso</h1>
          <p className="progress-page__subtitle">
            Volumen semanal y por ejercicio
          </p>
        </div>
        <Link className="progress-page__back" to="/">
          ← Inicio
        </Link>
      </header>

      {error ? (
        <p className="progress-page__error" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className="progress-page__section"
        aria-labelledby="weekly-heading"
      >
        <h2 id="weekly-heading" className="progress-page__section-title">
          Volumen por semana
        </h2>
        <p className="progress-page__hint">
          Suma kg × reps por semana (lun–dom).
        </p>
        {isLoadingWeekly ? (
          <p className="progress-page__status">Cargando…</p>
        ) : weekly.every((w) => w.volume === 0) ? (
          <p className="progress-page__empty">
            Registra entrenos con series para ver el gráfico.
          </p>
        ) : (
          <div className="progress-page__chart" role="img" aria-label="Volumen semanal">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{
                    fill: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'var(--sans)',
                  }}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'var(--sans)',
                  }}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => volumeTooltipFormatter(v)}
                  contentStyle={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
                <Bar
                  dataKey="volume"
                  fill="var(--accent)"
                  radius={[6, 6, 0, 0]}
                  name="Volumen"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section
        className="progress-page__section"
        aria-labelledby="exercise-heading"
      >
        <h2 id="exercise-heading" className="progress-page__section-title">
          Evolución por ejercicio
        </h2>
        <p className="progress-page__hint">
          Volumen por sesión del ejercicio elegido.
        </p>

        {isLoadingExercises ? (
          <p className="progress-page__status">Cargando…</p>
        ) : exercises.length === 0 ? (
          <p className="progress-page__empty">
            Añade ejercicios desde un entreno.
          </p>
        ) : (
          <>
            <label className="progress-page__label" htmlFor="progress-exercise">
              Ejercicio
            </label>
            <select
              id="progress-exercise"
              className="progress-page__select"
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <p className="progress-page__exercise-link-wrap">
              <Link
                className="progress-page__exercise-link"
                to={`/exercises/${selectedExerciseId}`}
              >
                Ver ejercicio →
              </Link>
            </p>

            {isLoadingSeries ? (
              <p className="progress-page__status">Cargando…</p>
            ) : exerciseSeries.length === 0 ? (
              <p className="progress-page__empty">
                Sin sesiones para «{selectedExercise?.name}».
              </p>
            ) : (
              <div
                className="progress-page__chart"
                role="img"
                aria-label={`Evolución de volumen para ${selectedExercise?.name}`}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={exerciseSeries}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: 'var(--text)',
                        fontSize: 12,
                        fontFamily: 'var(--sans)',
                      }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: 'var(--text)',
                        fontSize: 12,
                        fontFamily: 'var(--sans)',
                      }}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v) => volumeTooltipFormatter(v)}
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
                      dot={{ r: 4, fill: 'var(--accent)' }}
                      name="Volumen"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
