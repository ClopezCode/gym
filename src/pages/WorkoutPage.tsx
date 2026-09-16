import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { RestTimer } from '../components/RestTimer'
import { SessionExerciseCard } from '../components/SessionExerciseCard'
import { useWorkoutExercises } from '../hooks/useWorkoutExercises'
import { elapsedMs, formatElapsed } from '../lib/formatDuration'
import {
  MUSCLE_GROUPS,
  muscleGroupLabel,
  type MuscleGroup,
} from '../lib/muscleGroups'
import { parseRepsInput, parseRpeInput, parseWeightInput } from '../lib/parseSetInputs'
import { sessionExercisesFromWorkoutSets } from '../lib/sessionFromWorkoutSets'
import {
  clearWorkoutDraft,
  readWorkoutDraft,
  saveWorkoutDraft,
  sessionSignature,
  type WorkoutDraft,
} from '../lib/workoutDraftStorage'
import { getRoutineTemplateWithExercises } from '../services/routineTemplateService'
import { getSetsForWorkout } from '../services/setService'
import {
  getWorkoutById,
  saveCompleteWorkoutSession,
} from '../services/workoutService'
import type { Workout } from '../types/workout'
import './WorkoutPage.css'

type SetDraft = { weight: string; reps: string; rpe: string }

const emptyDraft = (): SetDraft => ({ weight: '', reps: '', rpe: '' })

type LocationState = { templateId?: string }

function formatDraftMoment(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return 'hace un momento'
  }
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
  const [isSessionHydrated, setIsSessionHydrated] = useState(false)
  const [savedSetCount, setSavedSetCount] = useState(0)
  const [savedSignature, setSavedSignature] = useState('')
  const [pendingDraft, setPendingDraft] = useState<WorkoutDraft | null>(null)
  const [notes, setNotes] = useState('')
  const [newMuscleGroup, setNewMuscleGroup] = useState<MuscleGroup>('full_body')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('')
  const [restTarget, setRestTarget] = useState(90)
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const {
    catalog,
    sessionExercises,
    isCatalogLoading,
    catalogError,
    isAdding,
    addError,
    addExerciseByName,
    hydrateSession,
    seedSessionWithExercises,
    addSetToExercise,
    updateSetInExercise,
    removeSetFromExercise,
    removeExerciseFromSession,
  } = useWorkoutExercises()

  const [exerciseName, setExerciseName] = useState('')
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({})
  const [addSetErrors, setAddSetErrors] = useState<Record<string, string | null>>(
    {},
  )

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const filteredCatalog = muscleFilter
    ? catalog.filter((ex) => ex.muscle_group === muscleFilter)
    : catalog

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (restLeft === null || restLeft <= 0) return
    const id = window.setTimeout(() => {
      setRestLeft((n) => (n == null ? null : Math.max(0, n - 1)))
    }, 1000)
    return () => window.clearTimeout(id)
  }, [restLeft])

  useEffect(() => {
    if (!workoutId) {
      return
    }

    let cancelled = false

    void (async () => {
      setIsWorkoutLoading(true)
      setWorkoutLoadError(null)
      setWorkout(null)
      setIsSessionHydrated(false)
      setSavedSetCount(0)
      setPendingDraft(null)

      const result = await getWorkoutById(workoutId)
      if (cancelled) return
      if (!result.ok) {
        setWorkoutLoadError(result.message)
        setIsWorkoutLoading(false)
        return
      }

      const setsResult = await getSetsForWorkout(workoutId)
      if (cancelled) return
      if (!setsResult.ok) {
        setWorkoutLoadError(setsResult.message)
        setIsWorkoutLoading(false)
        return
      }

      const fromDatabase = sessionExercisesFromWorkoutSets(setsResult.sets)
      const loadedNotes = result.workout.notes ?? ''
      const databaseSignature = sessionSignature(fromDatabase, loadedNotes)

      hydrateSession(fromDatabase)
      setSavedSetCount(setsResult.sets.length)
      setSavedSignature(databaseSignature)
      setNotes(loadedNotes)

      const draft = readWorkoutDraft(workoutId)
      if (draft && sessionSignature(draft.sessionExercises, draft.notes) !== databaseSignature) {
        setPendingDraft(draft)
      } else if (draft) {
        clearWorkoutDraft(workoutId)
      }

      setIsSessionHydrated(true)
      setWorkout(result.workout)
      setIsWorkoutLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [workoutId, hydrateSession])

  useEffect(() => {
    if (!workoutId || !templateIdFromNav || !workout || !isSessionHydrated) {
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
    isSessionHydrated,
    templateIdFromNav,
    seedSessionWithExercises,
    navigate,
    location.pathname,
  ])

  useEffect(() => {
    if (!workoutId || !isSessionHydrated || pendingDraft) {
      return
    }

    if (sessionSignature(sessionExercises, notes) === savedSignature) {
      clearWorkoutDraft(workoutId)
      return
    }

    saveWorkoutDraft(workoutId, sessionExercises, notes)
  }, [
    workoutId,
    isSessionHydrated,
    pendingDraft,
    sessionExercises,
    notes,
    savedSignature,
  ])

  function restorePendingDraft() {
    if (!pendingDraft) return
    hydrateSession(pendingDraft.sessionExercises)
    setNotes(pendingDraft.notes)
    setPendingDraft(null)
  }

  function discardPendingDraft() {
    if (workoutId) {
      clearWorkoutDraft(workoutId)
    }
    setPendingDraft(null)
  }

  async function handleAddExercise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await addExerciseByName(exerciseName, newMuscleGroup)
    setExerciseName('')
  }

  function getDraft(exerciseId: string): SetDraft {
    return setDrafts[exerciseId] ?? emptyDraft()
  }

  function patchDraft(exerciseId: string, patch: Partial<SetDraft>) {
    setSetDrafts((prev) => ({
      ...prev,
      [exerciseId]: { ...(prev[exerciseId] ?? emptyDraft()), ...patch },
    }))
  }

  function handleSubmitSetForExercise(exerciseId: string) {
    return (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const draft = getDraft(exerciseId)
      const w = parseWeightInput(draft.weight)
      const r = parseRepsInput(draft.reps)
      const rpe = parseRpeInput(draft.rpe)

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
      if (rpe === undefined) {
        setAddSetErrors((prev) => ({
          ...prev,
          [exerciseId]: 'RPE entre 1 y 10, o vacío.',
        }))
        return
      }

      const result = addSetToExercise(exerciseId, {
        weight: w,
        reps: r,
        rpe,
        restSeconds: restTarget,
      })
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
        [exerciseId]: { weight: String(w), reps: '', rpe: '' },
      }))
      setRestLeft(restTarget)
    }
  }

  async function handleSaveWorkout() {
    const totalSets = sessionExercises.reduce(
      (count, row) => count + row.sets.length,
      0,
    )

    if (totalSets === 0 && savedSetCount > 0) {
      const confirmed = window.confirm(
        `Este entreno tiene ${savedSetCount} serie(s) guardadas y la sesión está vacía. Si continúas se borrarán. ¿Guardar igualmente?`,
      )
      if (!confirmed) {
        return
      }
    }

    setSaveError(null)
    setSaveSuccess(null)
    setIsSaving(true)
    try {
      const result = await saveCompleteWorkoutSession({
        workoutId,
        sessionExercises,
        notes,
      })
      if (!result.ok) {
        setSaveError(result.message)
        return
      }
      setSavedSetCount(result.setsSaved)
      setSavedSignature(sessionSignature(sessionExercises, notes))
      clearWorkoutDraft(result.workoutId)
      if (workoutId && workoutId !== result.workoutId) {
        clearWorkoutDraft(workoutId)
      }
      setWorkout((prev) =>
        prev
          ? { ...prev, notes, ended_at: new Date().toISOString() }
          : prev,
      )
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

  const durationLabel = formatElapsed(
    elapsedMs(
      workout.started_at ?? workout.created_at,
      new Date(nowMs).toISOString(),
    ),
  )

  return (
    <main className="workout-page">
      <header className="workout-page__header">
        <div>
          <h1 className="workout-page__title">Entreno</h1>
          <p className="workout-page__meta">
            Fecha: <strong>{workout.date}</strong>
            {' · '}
            Duración: <strong>{durationLabel}</strong>
          </p>
        </div>
        <Link className="workout-page__back" to="/">
          ← Inicio
        </Link>
      </header>

      {restLeft !== null ? (
        <RestTimer
          secondsLeft={restLeft}
          totalSeconds={restTarget}
          onSkip={() => setRestLeft(null)}
          onAdjust={(delta) =>
            setRestLeft((n) => Math.max(0, (n ?? 0) + delta))
          }
        />
      ) : null}

      {pendingDraft ? (
        <div className="workout-page__draft" role="status">
          <p className="workout-page__draft-text">
            Tienes cambios sin guardar de este entreno, de{' '}
            <strong>{formatDraftMoment(pendingDraft.savedAt)}</strong>. Se
            quedaron en este dispositivo al cerrarse la página.
          </p>
          <div className="workout-page__draft-actions">
            <button
              type="button"
              className="workout-page__draft-restore"
              onClick={restorePendingDraft}
            >
              Recuperarlos
            </button>
            <button
              type="button"
              className="workout-page__draft-discard"
              onClick={discardPendingDraft}
            >
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      <section
        className="workout-page__section"
        aria-labelledby="exercises-heading"
      >
        <h2 id="exercises-heading" className="workout-page__section-title">
          Ejercicios
        </h2>

        <form className="workout-page__form" onSubmit={handleAddExercise}>
          <label className="workout-page__label" htmlFor="muscle-filter">
            Filtrar catálogo
          </label>
          <select
            id="muscle-filter"
            className="workout-page__input"
            value={muscleFilter}
            onChange={(e) =>
              setMuscleFilter((e.target.value || '') as MuscleGroup | '')
            }
          >
            <option value="">Todos los grupos</option>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {muscleGroupLabel(g)}
              </option>
            ))}
          </select>

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
              placeholder="Catálogo o nombre nuevo"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              disabled={isAdding || isCatalogLoading}
              aria-busy={isCatalogLoading}
            />
            <datalist id={listId}>
              {filteredCatalog.map((ex) => (
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
          <label className="workout-page__label" htmlFor="new-muscle">
            Grupo (si es nuevo)
          </label>
          <select
            id="new-muscle"
            className="workout-page__input"
            value={newMuscleGroup}
            onChange={(e) => setNewMuscleGroup(e.target.value as MuscleGroup)}
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {muscleGroupLabel(g)}
              </option>
            ))}
          </select>
          <label className="workout-page__label" htmlFor="rest-target">
            Descanso al agregar serie
          </label>
          <select
            id="rest-target"
            className="workout-page__input"
            value={restTarget}
            onChange={(e) => setRestTarget(Number(e.target.value))}
          >
            <option value={60}>60 s</option>
            <option value={90}>90 s</option>
            <option value={120}>120 s</option>
            <option value={180}>180 s</option>
          </select>
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
                  draftRpe={draft.rpe}
                  addSetError={addSetErrors[id] ?? null}
                  onDraftWeightChange={(value) => patchDraft(id, { weight: value })}
                  onDraftRepsChange={(value) => patchDraft(id, { reps: value })}
                  onDraftRpeChange={(value) => patchDraft(id, { rpe: value })}
                  onSubmitSet={handleSubmitSetForExercise(id)}
                  onUpdateSet={(localId, weight, reps, rpe) =>
                    updateSetInExercise(id, localId, { weight, reps, rpe })
                  }
                  onRemoveSet={(localId) => removeSetFromExercise(id, localId)}
                  onRemoveExercise={() => removeExerciseFromSession(id)}
                />
              )
            })}
          </ul>
        )}

        <div className="workout-page__notes">
          <label className="workout-page__label" htmlFor="workout-notes">
            Notas
          </label>
          <textarea
            id="workout-notes"
            className="workout-page__textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cómo te sentiste, molestias, etc."
          />
        </div>

        <div className="workout-page__save-bar">
          <button
            type="button"
            className="workout-page__save"
            onClick={handleSaveWorkout}
            disabled={isSaving || !isSessionHydrated}
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
