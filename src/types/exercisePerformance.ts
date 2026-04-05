/** Serie histórica de un ejercicio (consulta agregada con fecha del entreno). */
export type ExerciseSetHistoryEntry = {
  id: string
  weight: number
  reps: number
  created_at: string
  workout_id: string
  workout_date: string
}
