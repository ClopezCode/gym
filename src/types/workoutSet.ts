import type { Exercise } from './exercise'

export type WorkoutSetRow = {
  id: string
  workout_id: string | null
  exercise_id: string | null
  weight: number
  reps: number
  rpe: number | null
  rest_seconds: number | null
  created_at: string
}

export type WorkoutSetWithExercise = WorkoutSetRow & {
  exercise: Exercise | null
}
