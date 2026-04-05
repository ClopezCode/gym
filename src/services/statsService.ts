import { supabase } from '../lib/supabaseClient'
import {
  aggregateExerciseVolumeBySession,
  aggregateWeeklyVolume,
  lastNWeekMondayKeys,
  type ExerciseSessionVolumePoint,
  type WeeklyVolumePoint,
} from '../lib/statsAggregates'

type WorkoutDateEmbed = { date: string }

type SetStatsRow = {
  weight: number
  reps: number
  exercise_id: string | null
  workout_id: string | null
  workouts: WorkoutDateEmbed | WorkoutDateEmbed[] | null
}

function normalizeWorkoutDate(
  w: WorkoutDateEmbed | WorkoutDateEmbed[] | null,
): string | null {
  if (w == null) return null
  const o = Array.isArray(w) ? w[0] : w
  return o?.date ?? null
}

export type StatsResult<T> = { ok: true; data: T } | { ok: false; message: string }

const FETCH_LIMIT = 4000

async function fetchSetsWithWorkoutDates(): Promise<
  | { ok: true; rows: SetStatsRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('sets')
    .select(
      `
      weight,
      reps,
      exercise_id,
      workout_id,
      workouts!inner ( date )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT)

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, rows: (data ?? []) as SetStatsRow[] }
}

/**
 * Volumen total (kg × reps) agregado por semana (lunes a domingo), últimas `weekCount` semanas.
 */
export async function getWeeklyVolumeStats(
  weekCount: number,
): Promise<StatsResult<WeeklyVolumePoint[]>> {
  const keys = lastNWeekMondayKeys(weekCount)
  const minDate = keys[0] ?? ''

  const fetched = await fetchSetsWithWorkoutDates()
  if (!fetched.ok) {
    return { ok: false, message: fetched.message }
  }

  const flat: { weight: number; reps: number; workoutDate: string }[] = []
  for (const row of fetched.rows) {
    const wd = normalizeWorkoutDate(row.workouts)
    if (!wd || wd < minDate) continue
    flat.push({
      weight: Number(row.weight),
      reps: row.reps,
      workoutDate: wd,
    })
  }

  return {
    ok: true,
    data: aggregateWeeklyVolume(flat, keys),
  }
}

/**
 * Volumen por sesión de entreno para un ejercicio (más recientes primero en el gráfico).
 */
export async function getExerciseVolumeBySession(
  exerciseId: string,
  sessionLimit: number,
): Promise<StatsResult<ExerciseSessionVolumePoint[]>> {
  const fetched = await fetchSetsWithWorkoutDates()
  if (!fetched.ok) {
    return { ok: false, message: fetched.message }
  }

  const forExercise: {
    weight: number
    reps: number
    workoutId: string
    workoutDate: string
  }[] = []

  for (const row of fetched.rows) {
    if (row.exercise_id !== exerciseId) continue
    const wd = normalizeWorkoutDate(row.workouts)
    const wid = row.workout_id
    if (!wd || !wid) continue
    forExercise.push({
      weight: Number(row.weight),
      reps: row.reps,
      workoutId: wid,
      workoutDate: wd,
    })
  }

  return {
    ok: true,
    data: aggregateExerciseVolumeBySession(forExercise, sessionLimit),
  }
}
