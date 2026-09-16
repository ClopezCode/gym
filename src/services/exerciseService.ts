import { supabase } from '../lib/supabaseClient'
import {
  isMuscleGroup,
  type MuscleGroup,
} from '../lib/muscleGroups'
import type { Exercise } from '../types/exercise'
import type { ExerciseSetHistoryEntry } from '../types/exercisePerformance'

export const EXERCISE_COLUMNS = 'id, name, user_id, created_at, muscle_group'

export type ListExercisesSuccess = { ok: true; exercises: Exercise[] }
export type ListExercisesFailure = { ok: false; message: string }
export type ListExercisesResult = ListExercisesSuccess | ListExercisesFailure

export type EnsureExerciseSuccess = { ok: true; exercise: Exercise }
export type EnsureExerciseFailure = { ok: false; message: string }
export type EnsureExerciseResult = EnsureExerciseSuccess | EnsureExerciseFailure

function normalizeForCompare(name: string): string {
  return name.trim().toLowerCase()
}

function asExercise(row: Exercise): Exercise {
  return {
    ...row,
    muscle_group: isMuscleGroup(row.muscle_group) ? row.muscle_group : 'full_body',
  }
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
 * Catálogo global (`user_id` null) + ejercicios propios.
 */
export async function listUserExercises(): Promise<ListExercisesResult> {
  const auth = await getAuthenticatedUserId()
  if (!auth.ok) {
    return { ok: false, message: auth.message }
  }

  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_COLUMNS)
    .or(`user_id.eq.${auth.userId},user_id.is.null`)
    .order('name', { ascending: true })

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, exercises: ((data ?? []) as Exercise[]).map(asExercise) }
}

/**
 * Inserta un ejercicio nuevo para el usuario autenticado (`name` recortado).
 */
export async function createExercise(
  name: string,
  muscleGroup: MuscleGroup = 'full_body',
): Promise<EnsureExerciseResult> {
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
      muscle_group: muscleGroup,
    })
    .select(EXERCISE_COLUMNS)
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, exercise: asExercise(data as Exercise) }
}

/**
 * Devuelve un ejercicio del catálogo o del usuario (sin distinguir mayúsculas)
 * o crea uno nuevo si no hay coincidencia.
 */
export async function ensureExercise(
  name: string,
  muscleGroup: MuscleGroup = 'full_body',
): Promise<EnsureExerciseResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, message: 'El nombre del ejercicio no puede estar vacío.' }
  }

  const listed = await listUserExercises()
  if (!listed.ok) {
    return { ok: false, message: listed.message }
  }

  const target = normalizeForCompare(trimmed)
  const own = listed.exercises.find(
    (e) => e.user_id !== null && normalizeForCompare(e.name) === target,
  )
  if (own) {
    return { ok: true, exercise: own }
  }
  const global = listed.exercises.find(
    (e) => e.user_id === null && normalizeForCompare(e.name) === target,
  )
  if (global) {
    return { ok: true, exercise: global }
  }

  return createExercise(trimmed, muscleGroup)
}

type WorkoutEmbed = { id: string; date: string; user_id: string }

type SetHistoryRowDb = {
  id: string
  weight: number
  reps: number
  rpe: number | null
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
 * Ejercicio usable (propio o catálogo) + series en entrenos del usuario.
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
      .select(EXERCISE_COLUMNS)
      .eq('id', exerciseId)
      .or(`user_id.eq.${auth.userId},user_id.is.null`)
      .maybeSingle(),
    supabase
      .from('sets')
      .select(
        `
      id,
      weight,
      reps,
      rpe,
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

  const exerciseRow = asExercise(exerciseRes.data as Exercise)
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
      rpe: row.rpe == null ? null : Number(row.rpe),
      created_at: row.created_at,
      workout_id: row.workout_id ?? w.id,
      workout_date: w.date,
    })
  }

  return {
    ok: true,
    exercise: exerciseRow,
    history,
  }
}
