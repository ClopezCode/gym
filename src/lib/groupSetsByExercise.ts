import type { WorkoutSetWithExercise } from '../types/workoutSet'

export type ExerciseSetGroup = {
  exerciseId: string
  exerciseName: string
  sets: WorkoutSetWithExercise[]
}

export function groupSetsByExercise(
  sets: WorkoutSetWithExercise[],
): ExerciseSetGroup[] {
  const map = new Map<string, ExerciseSetGroup>()

  for (const s of sets) {
    const exerciseId = s.exercise_id ?? '_'
    const exerciseName = s.exercise?.name ?? 'Ejercicio desconocido'
    let group = map.get(exerciseId)
    if (!group) {
      group = { exerciseId, exerciseName, sets: [] }
      map.set(exerciseId, group)
    }
    group.sets.push(s)
  }

  return [...map.values()]
}
