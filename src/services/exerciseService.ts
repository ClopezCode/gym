import { supabase } from '../lib/supabaseClient'
import type { Exercise } from '../types/exercise'
import type { ExerciseSetHistoryEntry } from '../types/exercisePerformance'

export type ListExercisesSuccess = { ok: true; exercises: Exercise[] }
export type ListExercisesFailure = { ok: false; message: string }
export type ListExercisesResult = ListExercisesSuccess | ListExercisesFailure

export type EnsureExerciseSuccess = { ok: true; exercise: Exercise }
export type EnsureExerciseFailure = { ok: false; message: string }
export type EnsureExerciseResult = EnsureExerciseSuccess | EnsureExerciseFailure

function normalizeForCompare(name: string): string {
  return name.trim().toLowerCase()
}

async function getAuthenticatedUserId(): Promise<
  | { ok: true; userId: string }
  | { ok: false; message: string }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    return { ok: false, message: authError.message }
  }
  if (!user) {
    return { ok: false, message: 'No hay sesión activa.' }
  }
  return { ok: true, userId: user.id }
}

/**
 * Lista ejercicios cuyo `user_id` coincide con el usuario autenticado.
 */
export async function listUserExercises(): Promise<ListExercisesResult> {
  const auth = await getAuthenticatedUserId()
  if (!auth.ok) {
    return { ok: false, message: auth.message }
  }

  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, user_id, created_at')
    .eq('user_id', auth.userId)
    .order('name', { ascending: true })

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, exercises: (data ?? []) as Exercise[] }
}

/**
 * Inserta un ejercicio nuevo para el usuario autenticado (`name` recortado).
 */
export async function createExercise(name: string): Promise<EnsureExerciseResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, message: 'El nombre del ejercicio no puede estar vacío.' }
  }

  const auth = await getAuthenticatedUserId()
  if (!auth.ok) {
    return { ok: false, message: auth.message }
  }

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: auth.userId,
      name: trimmed,
    })
    .select('id, name, user_id, created_at')
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, exercise: data as Exercise }
}

/**
 * Devuelve un ejercicio existente del usuario (comparación sin distinguir mayúsculas)
 * o crea uno nuevo si no hay coincidencia.
 */
export async function ensureExercise(name: string): Promise<EnsureExerciseResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, message: 'El nombre del ejercicio no puede estar vacío.' }
  }

  const auth = await getAuthenticatedUserId()
  if (!auth.ok) {
    return { ok: false, message: auth.message }
  }

  const target = normalizeForCompare(trimmed)

  const { data: rows, error } = await supabase
    .from('exercises')
    .select('id, name, user_id, created_at')
    .eq('user_id', auth.userId)

  if (error) {
    return { ok: false, message: error.message }
  }

  const list = (rows ?? []) as Exercise[]
  const existing = list.find((e) => normalizeForCompare(e.name) === target)
  if (existing) {
    return { ok: true, exercise: existing }
  }

  return createExercise(trimmed)
}

type WorkoutEmbed = { id: string; date: string; user_id: string }

type SetHistoryRowDb = {
  id: string
  weight: number
  reps: number
  created_at: string
  workout_id: string | null
  workouts: WorkoutEmbed | WorkoutEmbed[] | null
}

function normalizeWorkoutEmbed(
  raw: WorkoutEmbed | WorkoutEmbed[] | null,
): WorkoutEmbed | null {
  if (raw == null) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

export type GetExercisePerformanceDetailSuccess = {
  ok: true
  exercise: Exercise
  history: ExerciseSetHistoryEntry[]
}

export type GetExercisePerformanceDetailFailure = {
  ok: false
  message: string
}

export type GetExercisePerformanceDetailResult =
  | GetExercisePerformanceDetailSuccess
  | GetExercisePerformanceDetailFailure

/**
 * Ejercicio del usuario + todas sus series en entrenamientos propios,
 * en una sola query de series (join `workouts!inner` filtrado por `user_id`)
 * más una lectura puntual del ejercicio para validar titularidad.
 */
export async function getExercisePerformanceDetail(
  exerciseId: string,
): Promise<GetExercisePerformanceDetailResult> {
  const auth = await getAuthenticatedUserId()
  if (!auth.ok) {
    return { ok: false, message: auth.message }
  }

  const [exerciseRes, setsRes] = await Promise.all([
    supabase
      .from('exercises')
      .select('id, name, user_id, created_at')
      .eq('id', exerciseId)
      .eq('user_id', auth.userId)
      .maybeSingle(),
    supabase
      .from('sets')
      .select(
        `
      id,
      weight,
      reps,
      created_at,
      workout_id,
      workouts!inner ( id, date, user_id )
    `,
      )
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', auth.userId)
      .order('created_at', { ascending: false }),
  ])

  if (exerciseRes.error) {
    return { ok: false, message: exerciseRes.error.message }
  }
  if (!exerciseRes.data) {
    return { ok: false, message: 'Ejercicio no encontrado o sin permiso.' }
  }

  if (setsRes.error) {
    return { ok: false, message: setsRes.error.message }
  }

  const exerciseRow = exerciseRes.data
  const setRows = setsRes.data

  const rawRows = (setRows ?? []) as SetHistoryRowDb[]
  const history: ExerciseSetHistoryEntry[] = []

  for (const row of rawRows) {
    const w = normalizeWorkoutEmbed(row.workouts)
    if (!w) continue
    history.push({
      id: row.id,
      weight: Number(row.weight),
      reps: row.reps,
      created_at: row.created_at,
      workout_id: row.workout_id ?? w.id,
      workout_date: w.date,
    })
  }

  return {
    ok: true,
    exercise: exerciseRow as Exercise,
    history,
  }
}

