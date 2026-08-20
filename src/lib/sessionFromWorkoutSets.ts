import type { SessionExercise } from '../types/workoutSession'
import type { WorkoutSetWithExercise } from '../types/workoutSet'

/**
 * Convierte las series persistidas de un entreno en el estado local de la sesión.
 * Las series sin ejercicio asociado se descartan: no se pueden mostrar ni volver
 * a enviar a `replace_workout_sets`, que exige un `exercise_id` propio.
 */
export function sessionExercisesFromWorkoutSets(
  sets: WorkoutSetWithExercise[],
): SessionExercise[] {
  const byExerciseId = new Map<string, SessionExercise>()

  for (const row of sets) {
    const exercise = row.exercise
    if (!exercise) continue

    let entry = byExerciseId.get(exercise.id)
    if (!entry) {
      entry = { exercise, sets: [] }
      byExerciseId.set(exercise.id, entry)
    }

    entry.sets.push({
      localId: crypto.randomUUID(),
      weight: row.weight,
      reps: row.reps,
    })
  }

  return [...byExerciseId.values()]
}
