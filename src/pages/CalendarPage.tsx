import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { monthGrid, monthTitle, toISODate } from '../lib/calendarMonth'
import { formatWorkoutDate } from '../lib/formatWorkoutDate'
import { createWorkout, listUserWorkouts } from '../services/workoutService'
import type { Workout } from '../types/workout'
import './CalendarPage.css'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function CalendarPage() {
  const navigate = useNavigate()
  const today = toISODate(new Date())
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setIsLoading(true)
      setError(null)
      const res = await listUserWorkouts()
      if (cancelled) return
      if (!res.ok) {
        setError(res.message)
        setWorkouts([])
      } else {
        setWorkouts(res.workouts)
      }
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cells = useMemo(
    () => monthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  const byDate = useMemo(() => {
    const map = new Map<string, Workout[]>()
    for (const w of workouts) {
      const list = map.get(w.date) ?? []
      list.push(w)
      map.set(w.date, list)
    }
    return map
  }, [workouts])

  const selected = selectedDate ? (byDate.get(selectedDate) ?? []) : []

  function shiftMonth(delta: number) {
    setSelectedDate(null)
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  async function startWorkoutOn(date: string) {
    setIsCreating(true)
    setError(null)
    try {
      const res = await createWorkout(date)
      if (!res.ok) {
        setError(res.message)
        return
      }
      navigate(`/workouts/${res.workout.id}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="calendar-page">
      <header className="calendar-page__header">
        <div>
          <h1 className="calendar-page__title">Calendario</h1>
          <p className="calendar-page__subtitle">Días con entreno y alta rápida</p>
        </div>
        <Link className="calendar-page__back" to="/">
          ← Inicio
        </Link>
      </header>

      {error ? (
        <p className="calendar-page__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="calendar-page__nav">
        <button
          type="button"
          className="calendar-page__nav-btn"
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <h2 className="calendar-page__month">{monthTitle(cursor.year, cursor.month)}</h2>
        <button
          type="button"
          className="calendar-page__nav-btn"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      {isLoading ? (
        <p className="calendar-page__status">Cargando…</p>
      ) : (
        <div className="calendar-page__grid" role="grid" aria-label="Mes">
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-page__weekday">
              {d}
            </div>
          ))}
          {cells.map((cell) => {
            const count = byDate.get(cell.date)?.length ?? 0
            const isToday = cell.date === today
            const isSelected = cell.date === selectedDate
            return (
              <button
                key={cell.date + String(cell.inMonth)}
                type="button"
                className={[
                  'calendar-page__day',
                  cell.inMonth ? '' : 'calendar-page__day--muted',
                  isToday ? 'calendar-page__day--today' : '',
                  isSelected ? 'calendar-page__day--selected' : '',
                  count > 0 ? 'calendar-page__day--has' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedDate(cell.date)}
              >
                <span>{cell.day}</span>
                {count > 0 ? (
                  <span className="calendar-page__dot" aria-label={`${count} entreno(s)`} />
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      {selectedDate ? (
        <section className="calendar-page__detail" aria-live="polite">
          <h3 className="calendar-page__detail-title">
            {formatWorkoutDate(selectedDate)}
          </h3>
          {selected.length === 0 ? (
            <p className="calendar-page__empty">Sin entrenos este día.</p>
          ) : (
            <ul className="calendar-page__list">
              {selected.map((w) => (
                <li key={w.id}>
                  <Link className="calendar-page__link" to={`/history/${w.id}`}>
                    Ver entreno
                    {w.notes ? ` · ${w.notes.slice(0, 40)}` : ''}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="calendar-page__primary"
            onClick={() => startWorkoutOn(selectedDate)}
            disabled={isCreating}
          >
            {isCreating ? 'Creando…' : 'Nuevo entreno este día'}
          </button>
        </section>
      ) : (
        <p className="calendar-page__hint">Toca un día para ver o registrar.</p>
      )}
    </main>
  )
}
