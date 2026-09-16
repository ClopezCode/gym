import type { Exercise } from './exercise'

/** Set en memoria antes de persistir en Supabase */
export type LocalSessionSet = {
  localId: string
  weight: number
  reps: number
  rpe: number | null
  restSeconds: number | null
}

export type SessionExercise = {
  exercise: Exercise
  sets: LocalSessionSet[]
}
