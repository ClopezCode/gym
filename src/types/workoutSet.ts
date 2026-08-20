import type { Exercise } from './exercise'

export type WorkoutSetRow = {
  id: string
  workout_id: string | null
  exercise_id: string | null
  weight: number
  reps: number
  created_at: string
}

export type WorkoutSetWithExercise = WorkoutSetRow & {
  exercise: Exercise | null
}
