import { supabase } from '../lib/supabaseClient'
import type { Exercise } from '../types/exercise'
import type { WorkoutSetWithExercise } from '../types/workoutSet'

type ExerciseEmbed = Exercise

type SetRowFromDb = {
  id: string
  workout_id: string | null
  exercise_id: string | null
  weight: number
  reps: number
  rpe: number | null
  rest_seconds: number | null
  created_at: string
  exercises: ExerciseEmbed | ExerciseEmbed[] | null
}

function normalizeExercise(
  raw: ExerciseEmbed | ExerciseEmbed[] | null,
): ExerciseEmbed | null {
  if (raw == null) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

export type ListSetsForWorkoutSuccess = { ok: true; sets: WorkoutSetWithExercise[] }
export type ListSetsForWorkoutFailure = { ok: false; message: string }
export type ListSetsForWorkoutResult =
  | ListSetsForWorkoutSuccess
  | ListSetsForWorkoutFailure

/**
 * Series de un entrenamiento con datos del ejercicio.
 * La autorización debe garantizarse con RLS y/o comprobando el workout antes de llamar.
 */
export async function getSetsForWorkout(
  workoutId: string,
): Promise<ListSetsForWorkoutResult> {
  const { data, error } = await supabase
    .from('sets')
    .select(
      `
      id,
      workout_id,
      exercise_id,
      weight,
      reps,
      rpe,
      rest_seconds,
      created_at,
      exercises ( id, name, user_id, created_at, muscle_group )
    `,
    )
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true })

  if (error) {
    return { ok: false, message: error.message }
  }

  const rows = data as SetRowFromDb[] | null
  const sets: WorkoutSetWithExercise[] = (rows ?? []).map((row) => ({
    id: row.id,
    workout_id: row.workout_id,
    exercise_id: row.exercise_id,
    weight: Number(row.weight),
    reps: row.reps,
    rpe: row.rpe == null ? null : Number(row.rpe),
    rest_seconds: row.rest_seconds == null ? null : Number(row.rest_seconds),
    created_at: row.created_at,
    exercise: normalizeExercise(row.exercises),
  }))

  return { ok: true, sets }
}
