import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AddSetResult } from '../hooks/useWorkoutExercises'
import { parseRepsInput, parseWeightInput } from '../lib/parseSetInputs'
import type { LocalSessionSet, SessionExercise } from '../types/workoutSession'
import './SessionExerciseCard.css'

type SessionSetRowProps = {
  index: number
  set: LocalSessionSet
  onUpdate: (weight: number, reps: number) => AddSetResult
  onRemove: () => void
}

function SessionSetRow({ index, set, onUpdate, onRemove }: SessionSetRowProps) {
  const [weightDraft, setWeightDraft] = useState(() => String(set.weight))
  const [repsDraft, setRepsDraft] = useState(() => String(set.reps))
  const [error, setError] = useState<string | null>(null)

  // Al salir del campo se confirma el cambio. Si no es válido se restaura el
  // valor anterior, para que lo que se ve sea siempre lo que se va a guardar.
  function commit() {
    const weight = parseWeightInput(weightDraft)
    const reps = parseRepsInput(repsDraft)
    const result: AddSetResult =
      weight === null || reps === null
        ? { ok: false, message: 'Peso y repeticiones deben ser números.' }
        : onUpdate(weight, reps)

    if (!result.ok) {
      setWeightDraft(String(set.weight))
      setRepsDraft(String(set.reps))
      setError(result.message)
      return
    }

    setWeightDraft(String(weight))
    setRepsDraft(String(reps))
    setError(null)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <li className="session-exercise-card__set-item">
      <div className="session-exercise-card__set-line">
        <span className="session-exercise-card__set-n">{index + 1}</span>
        <input
          className="session-exercise-card__set-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`Peso de la serie ${index + 1}`}
          aria-invalid={error !== null}
          value={weightDraft}
          onChange={(e) => setWeightDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
        <span className="session-exercise-card__set-unit">kg ×</span>
        <input
          className="session-exercise-card__set-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`Repeticiones de la serie ${index + 1}`}
          aria-invalid={error !== null}
          value={repsDraft}
          onChange={(e) => setRepsDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="session-exercise-card__set-remove"
          onClick={onRemove}
          aria-label={`Eliminar serie ${index + 1}`}
        >
          ×
        </button>
      </div>
      {error ? (
        <p className="session-exercise-card__set-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  )
}

type SessionExerciseCardProps = {
  row: SessionExercise
  draftWeight: string
  draftReps: string
  addSetError: string | null
  onDraftWeightChange: (value: string) => void
  onDraftRepsChange: (value: string) => void
  onSubmitSet: (e: FormEvent<HTMLFormElement>) => void
  onUpdateSet: (localId: string, weight: number, reps: number) => AddSetResult
  onRemoveSet: (localId: string) => void
  onRemoveExercise: () => void
}

export function SessionExerciseCard({
  row,
  draftWeight,
  draftReps,
  addSetError,
  onDraftWeightChange,
  onDraftRepsChange,
  onSubmitSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
}: SessionExerciseCardProps) {
  const baseId = useId()
  const weightId = `${baseId}-weight`
  const repsId = `${baseId}-reps`

  function handleRemoveExercise() {
    if (row.sets.length > 0) {
      const confirmed = window.confirm(
        `«${row.exercise.name}» tiene ${row.sets.length} serie(s) en esta sesión. ¿Quitarlo del entreno?`,
      )
      if (!confirmed) {
        return
      }
    }
    onRemoveExercise()
  }

  return (
    <li className="session-exercise-card">
      <div className="session-exercise-card__header">
        <h3 className="session-exercise-card__title">
          <Link
            className="session-exercise-card__title-link"
            to={`/exercises/${row.exercise.id}`}
          >
            {row.exercise.name}
          </Link>
        </h3>
        <button
          type="button"
          className="session-exercise-card__remove-exercise"
          onClick={handleRemoveExercise}
        >
          Quitar
        </button>
      </div>

      {row.sets.length > 0 ? (
        <ul className="session-exercise-card__sets" aria-label="Series registradas">
          {row.sets.map((s, index) => (
            <SessionSetRow
              key={s.localId}
              index={index}
              set={s}
              onUpdate={(weight, reps) => onUpdateSet(s.localId, weight, reps)}
              onRemove={() => onRemoveSet(s.localId)}
            />
          ))}
        </ul>
      ) : null}

      <form
        className="session-exercise-card__form"
        onSubmit={onSubmitSet}
      >
        <div className="session-exercise-card__inputs">
          <div className="session-exercise-card__field">
            <label className="session-exercise-card__label" htmlFor={weightId}>
              kg
            </label>
            <input
              id={weightId}
              className="session-exercise-card__input"
              name="weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={draftWeight}
              onChange={(e) => onDraftWeightChange(e.target.value)}
              enterKeyHint="next"
            />
          </div>
          <div className="session-exercise-card__field">
            <label className="session-exercise-card__label" htmlFor={repsId}>
              reps
            </label>
            <input
              id={repsId}
              className="session-exercise-card__input"
              name="reps"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={draftReps}
              onChange={(e) => onDraftRepsChange(e.target.value)}
              enterKeyHint="done"
            />
          </div>
          <button type="submit" className="session-exercise-card__add">
            Agregar set
          </button>
        </div>
        {addSetError ? (
          <p className="session-exercise-card__error" role="alert">
            {addSetError}
          </p>
        ) : null}
      </form>
    </li>
  )
}
