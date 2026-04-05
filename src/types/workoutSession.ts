import type { Exercise } from './exercise'

/** Set en memoria antes de persistir en Supabase */
export type LocalSessionSet = {
  localId: string
  weight: number
  reps: number
}

export type SessionExercise = {
  exercise: Exercise
  sets: LocalSessionSet[]
}
