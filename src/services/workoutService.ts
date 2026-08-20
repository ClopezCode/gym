import { supabase } from '../lib/supabaseClient'
import type { SessionExercise } from '../types/workoutSession'
import type { Workout } from '../types/workout'

function todayLocalISODate(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type CreateWorkoutSuccess = { ok: true; workout: Workout }

export type CreateWorkoutFailure = { ok: false; message: string }

export type CreateWorkoutResult = CreateWorkoutSuccess | CreateWorkoutFailure

/**
 * Inserta un workout para el usuario autenticado con la fecha local actual.
 */
export async function createWorkout(): Promise<CreateWorkoutResult> {
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

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      date: todayLocalISODate(),
    })
    .select('id, user_id, date, created_at')
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, workout: data as Workout }
}

export type GetWorkoutSuccess = { ok: true; workout: Workout }

/**
 * `not_found` significa que la consulta funcionó y el entreno no existe.
 * `error` significa que no se pudo comprobar (red caída, sesión, permisos).
 */
export type GetWorkoutFailure = {
  ok: false
  reason: 'not_found' | 'error'
  message: string
}

export type GetWorkoutResult = GetWorkoutSuccess | GetWorkoutFailure

/**
 * Obtiene un workout por id si pertenece al usuario autenticado.
 */
export async function getWorkoutById(workoutId: string): Promise<GetWorkoutResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    return { ok: false, reason: 'error', message: authError.message }
  }
  if (!user) {
    return { ok: false, reason: 'error', message: 'No hay sesión activa.' }
  }

  const { data, error } = await supabase
    .from('workouts')
    .select('id, user_id, date, created_at')
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return { ok: false, reason: 'error', message: error.message }
  }
  if (!data) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Entrenamiento no encontrado o sin permiso.',
    }
  }

  return { ok: true, workout: data as Workout }
}

export type ListWorkoutsSuccess = { ok: true; workouts: Workout[] }
export type ListWorkoutsFailure = { ok: false; message: string }
export type ListWorkoutsResult = ListWorkoutsSuccess | ListWorkoutsFailure

/**
 * Lista entrenamientos del usuario, más recientes primero (fecha, luego creación).
 */
export async function listUserWorkouts(): Promise<ListWorkoutsResult> {
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

  const { data, error } = await supabase
    .from('workouts')
    .select('id, user_id, date, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, workouts: (data ?? []) as Workout[] }
}

/** Payload para la RPC `replace_workout_sets` (sin workout_id por fila). */
type ReplaceWorkoutSetItem = {
  exercise_id: string
  weight: number
  reps: number
}

function buildReplaceWorkoutSetsPayload(
  sessionExercises: SessionExercise[],
): ReplaceWorkoutSetItem[] {
  const items: ReplaceWorkoutSetItem[] = []
  for (const row of sessionExercises) {
    for (const s of row.sets) {
      items.push({
        exercise_id: row.exercise.id,
        weight: s.weight,
        reps: s.reps,
      })
    }
  }
  return items
}

/**
 * Si `workoutId` existe para el usuario, lo usa. Solo crea uno nuevo cuando no
 * hay id o se confirma que el entreno no existe: si la comprobación falla por
 * red o sesión se aborta, porque crear otro dejaría un duplicado en el historial.
 */
async function resolveWorkoutIdForSave(
  workoutId: string | null | undefined,
): Promise<{ ok: true; workoutId: string } | { ok: false; message: string }> {
  if (workoutId) {
    const existing = await getWorkoutById(workoutId)
    if (existing.ok) {
      return { ok: true, workoutId: existing.workout.id }
    }
    if (existing.reason === 'error') {
      return { ok: false, message: existing.message }
    }
  }

  const created = await createWorkout()
  if (!created.ok) {
    return { ok: false, message: created.message }
  }
  return { ok: true, workoutId: created.workout.id }
}

export type SaveCompleteWorkoutSuccess = {
  ok: true
  workoutId: string
  setsSaved: number
}

export type SaveCompleteWorkoutFailure = { ok: false; message: string }

export type SaveCompleteWorkoutResult =
  | SaveCompleteWorkoutSuccess
  | SaveCompleteWorkoutFailure

/**
 * Asegura un workout (existente o recién creado) y persiste las series con la
 * RPC `replace_workout_sets` (DELETE + INSERT en una sola transacción en BD).
 */
export async function saveCompleteWorkoutSession(params: {
  workoutId: string | null | undefined
  sessionExercises: SessionExercise[]
}): Promise<SaveCompleteWorkoutResult> {
  const resolved = await resolveWorkoutIdForSave(params.workoutId)
  if (!resolved.ok) {
    return { ok: false, message: resolved.message }
  }

  const targetWorkoutId = resolved.workoutId
  const payload = buildReplaceWorkoutSetsPayload(params.sessionExercises)

  const { data, error } = await supabase.rpc('replace_workout_sets', {
    p_workout_id: targetWorkoutId,
    p_sets: payload,
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  const setsSaved = typeof data === 'number' ? data : Number(data)

  return {
    ok: true,
    workoutId: targetWorkoutId,
    setsSaved: Number.isFinite(setsSaved) ? setsSaved : payload.length,
  }
}
