import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { SessionExerciseCard } from '../components/SessionExerciseCard'
import { useWorkoutExercises } from '../hooks/useWorkoutExercises'
import { parseRepsInput, parseWeightInput } from '../lib/parseSetInputs'
import { getRoutineTemplateWithExercises } from '../services/routineTemplateService'
import {
  getWorkoutById,
  saveCompleteWorkoutSession,
} from '../services/workoutService'
import type { Workout } from '../types/workout'
import './WorkoutPage.css'

type SetDraft = { weight: string; reps: string }

const emptyDraft = (): SetDraft => ({ weight: '', reps: '' })

type LocationState = { templateId?: string }

export function WorkoutPage() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const listId = useId()
  const templateIdFromNav = (location.state as LocationState | null)?.templateId

  const [workout, setWorkout] = useState<Workout | null>(null)
  const [workoutLoadError, setWorkoutLoadError] = useState<string | null>(null)
  const [isWorkoutLoading, setIsWorkoutLoading] = useState(() =>
    Boolean(workoutId),
  )

  const {
    catalog,
    sessionExercises,
    isCatalogLoading,
    catalogError,
    isAdding,
    addError,
    addExerciseByName,
    seedSessionWithExercises,
    addSetToExercise,
  } = useWorkoutExercises()

  const [exerciseName, setExerciseName] = useState('')
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({})
  const [addSetErrors, setAddSetErrors] = useState<Record<string, string | null>>(
    {},
  )

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!workoutId) {
      return
    }

    let cancelled = false

    void (async () => {
      setIsWorkoutLoading(true)
      setWorkoutLoadError(null)
      setWorkout(null)

      const result = await getWorkoutById(workoutId)
      if (cancelled) return
      if (result.ok) {
        setWorkout(result.workout)
      } else {
        setWorkoutLoadError(result.message)
      }
      setIsWorkoutLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [workoutId])

  useEffect(() => {
    if (!workoutId || !templateIdFromNav || !workout) {
      return
    }

    let cancelled = false

    void (async () => {
      const res = await getRoutineTemplateWithExercises(templateIdFromNav)
      if (cancelled) return
      if (res.ok) {
        const exercises = res.template.items.map((i) => i.exercise)
        seedSessionWithExercises(exercises)
      }
      navigate(location.pathname, { replace: true, state: {} })
    })()

    return () => {
      cancelled = true
    }
  }, [
    workoutId,
    workout,
    templateIdFromNav,
    seedSessionWithExercises,
    navigate,
    location.pathname,
  ])

  async function handleAddExercise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await addExerciseByName(exerciseName)
    setExerciseName('')
  }

  function getDraft(exerciseId: string): SetDraft {
    return setDrafts[exerciseId] ?? emptyDraft()
  }

  function handleSubmitSetForExercise(exerciseId: string) {
    return (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const draft = getDraft(exerciseId)
      const w = parseWeightInput(draft.weight)
      const r = parseRepsInput(draft.reps)

      if (w === null) {
        setAddSetErrors((prev) => ({
          ...prev,
          [exerciseId]: 'Peso ≥ 0.',
        }))
        return
      }
      if (r === null) {
        setAddSetErrors((prev) => ({
          ...prev,
          [exerciseId]: 'Reps enteras ≥ 1.',
        }))
        return
      }

      const result = addSetToExercise(exerciseId, w, r)
      if (!result.ok) {
        setAddSetErrors((prev) => ({
          ...prev,
          [exerciseId]: result.message,
        }))
        return
      }

      setAddSetErrors((prev) => ({ ...prev, [exerciseId]: null }))
      setSetDrafts((prev) => ({
        ...prev,
        [exerciseId]: { weight: String(w), reps: '' },
      }))
    }
  }

  async function handleSaveWorkout() {
    setSaveError(null)
    setSaveSuccess(null)
    setIsSaving(true)
    try {
      const result = await saveCompleteWorkoutSession({
        workoutId,
        sessionExercises,
      })
      if (!result.ok) {
        setSaveError(result.message)
        return
      }
      setSaveSuccess(
        result.setsSaved === 0
          ? 'Guardado (sin series).'
          : `${result.setsSaved} serie(s) guardadas.`,
      )
      if (result.workoutId !== workoutId) {
        navigate(`/workouts/${result.workoutId}`, { replace: true })
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!workoutId) {
    return (
      <main className="workout-page">
        <p className="workout-page__error" role="alert">
          Entreno no válido.
        </p>
        <Link className="workout-page__back" to="/">
          ← Inicio
        </Link>
      </main>
    )
  }

  if (isWorkoutLoading) {
    return (
      <main className="workout-page">
        <p className="workout-page__loading" role="status">
          Cargando…
        </p>
      </main>
    )
  }

  if (workoutLoadError || !workout) {
    return (
      <main className="workout-page">
        <p className="workout-page__error" role="alert">
          {workoutLoadError ?? 'No se pudo cargar el entreno.'}
        </p>
        <Link className="workout-page__back" to="/">
          ← Inicio
        </Link>
      </main>
    )
  }

  return (
    <main className="workout-page">
      <header className="workout-page__header">
        <div>
          <h1 className="workout-page__title">Entreno</h1>
          <p className="workout-page__meta">
            Fecha: <strong>{workout.date}</strong>
          </p>
        </div>
        <Link className="workout-page__back" to="/">
          ← Inicio
        </Link>
      </header>

      <section
        className="workout-page__section"
        aria-labelledby="exercises-heading"
      >
        <h2 id="exercises-heading" className="workout-page__section-title">
          Ejercicios
        </h2>

        <form className="workout-page__form" onSubmit={handleAddExercise}>
          <label className="workout-page__label" htmlFor="exercise-input">
            Ejercicio
          </label>
          <div className="workout-page__field-row">
            <input
              id="exercise-input"
              className="workout-page__input"
              name="exercise"
              type="text"
              list={listId}
              autoComplete="off"
              placeholder="Ejercicio"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              disabled={isAdding || isCatalogLoading}
              aria-busy={isCatalogLoading}
            />
            <datalist id={listId}>
              {catalog.map((ex) => (
                <option key={ex.id} value={ex.name} />
              ))}
            </datalist>
            <button
              type="submit"
              className="workout-page__submit"
              disabled={
                isAdding || isCatalogLoading || exerciseName.trim() === ''
              }
            >
              {isAdding ? 'Añadiendo…' : 'Añadir'}
            </button>
          </div>
          {catalogError ? (
            <p className="workout-page__error" role="alert">
              {catalogError}
            </p>
          ) : null}
          {addError ? (
            <p className="workout-page__error" role="alert">
              {addError}
            </p>
          ) : null}
        </form>

        {sessionExercises.length === 0 ? (
          <p className="workout-page__empty">Sin ejercicios en esta sesión.</p>
        ) : (
          <ul className="workout-page__session-list">
            {sessionExercises.map((row) => {
              const id = row.exercise.id
              const draft = getDraft(id)
              return (
                <SessionExerciseCard
                  key={id}
                  row={row}
                  draftWeight={draft.weight}
                  draftReps={draft.reps}
                  addSetError={addSetErrors[id] ?? null}
                  onDraftWeightChange={(value) =>
                    setSetDrafts((prev) => ({
                      ...prev,
                      [id]: { ...(prev[id] ?? emptyDraft()), weight: value },
                    }))
                  }
                  onDraftRepsChange={(value) =>
                    setSetDrafts((prev) => ({
                      ...prev,
                      [id]: { ...(prev[id] ?? emptyDraft()), reps: value },
                    }))
                  }
                  onSubmitSet={handleSubmitSetForExercise(id)}
                />
              )
            })}
          </ul>
        )}

        <div className="workout-page__save-bar">
          <button
            type="button"
            className="workout-page__save"
            onClick={handleSaveWorkout}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
          {saveError ? (
            <p className="workout-page__error" role="alert">
              {saveError}
            </p>
          ) : null}
          {saveSuccess ? (
            <p className="workout-page__success" role="status">
              {saveSuccess}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
