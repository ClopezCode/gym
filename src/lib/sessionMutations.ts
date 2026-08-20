import type { SessionExercise } from '../types/workoutSession'

/** Copia de la sesión con el peso y las repeticiones de una serie cambiados. */
export function updateSetInSession(
  session: SessionExercise[],
  exerciseId: string,
  localId: string,
  weight: number,
  reps: number,
): SessionExercise[] {
  return session.map((row) =>
    row.exercise.id !== exerciseId
      ? row
      : {
          ...row,
          sets: row.sets.map((s) =>
            s.localId === localId ? { ...s, weight, reps } : s,
          ),
        },
  )
}

/**
 * Copia de la sesión sin la serie indicada. El ejercicio se conserva aunque
 * se quede sin series, para poder volver a registrarlas sin buscarlo de nuevo.
 */
export function removeSetFromSession(
  session: SessionExercise[],
  exerciseId: string,
  localId: string,
): SessionExercise[] {
  return session.map((row) =>
    row.exercise.id !== exerciseId
      ? row
      : { ...row, sets: row.sets.filter((s) => s.localId !== localId) },
  )
}

/** Copia de la sesión sin el ejercicio indicado ni sus series. */
export function removeExerciseFromSession(
  session: SessionExercise[],
  exerciseId: string,
): SessionExercise[] {
  return session.filter((row) => row.exercise.id !== exerciseId)
}
