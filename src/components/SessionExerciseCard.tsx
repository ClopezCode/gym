import { useId, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { SessionExercise } from '../types/workoutSession'
import './SessionExerciseCard.css'

type SessionExerciseCardProps = {
  row: SessionExercise
  draftWeight: string
  draftReps: string
  addSetError: string | null
  onDraftWeightChange: (value: string) => void
  onDraftRepsChange: (value: string) => void
  onSubmitSet: (e: FormEvent<HTMLFormElement>) => void
}

function formatWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n)
}

export function SessionExerciseCard({
  row,
  draftWeight,
  draftReps,
  addSetError,
  onDraftWeightChange,
  onDraftRepsChange,
  onSubmitSet,
}: SessionExerciseCardProps) {
  const baseId = useId()
  const weightId = `${baseId}-weight`
  const repsId = `${baseId}-reps`

  return (
    <li className="session-exercise-card">
      <h3 className="session-exercise-card__title">
        <Link
          className="session-exercise-card__title-link"
          to={`/exercises/${row.exercise.id}`}
        >
          {row.exercise.name}
        </Link>
      </h3>

      {row.sets.length > 0 ? (
        <ul className="session-exercise-card__sets" aria-label="Series registradas">
          {row.sets.map((s, index) => (
            <li key={s.localId} className="session-exercise-card__set-line">
              <span className="session-exercise-card__set-n">{index + 1}</span>
              <span className="session-exercise-card__set-values">
                {formatWeight(s.weight)} kg × {s.reps}
              </span>
            </li>
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
