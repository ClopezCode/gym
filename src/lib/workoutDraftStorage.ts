import type { SessionExercise } from '../types/workoutSession'

const KEY_PREFIX = 'gym:workout-draft:'

export type WorkoutDraft = {
  savedAt: string
  sessionExercises: SessionExercise[]
  notes: string
}

/**
 * Huella del contenido de una sesión, ignorando los identificadores locales.
 * Sirve para saber si lo que hay en pantalla difiere de lo ya persistido.
 */
export function sessionSignature(session: SessionExercise[], notes = ''): string {
  const setsPart = session
    .map(
      (row) =>
        `${row.exercise.id}:${row.sets
          .map(
            (s) =>
              `${s.weight}x${s.reps}@${s.rpe ?? ''}/${s.restSeconds ?? ''}`,
          )
          .join(',')}`,
    )
    .join('|')
  return `${setsPart}#${notes}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOptionalNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || typeof value === 'number'
}

function isSessionExercise(value: unknown): value is SessionExercise {
  if (!isRecord(value)) return false

  const { exercise, sets } = value
  if (!isRecord(exercise)) return false
  if (typeof exercise.id !== 'string' || typeof exercise.name !== 'string') {
    return false
  }
  if (!Array.isArray(sets)) return false

  return sets.every(
    (s) =>
      isRecord(s) &&
      typeof s.localId === 'string' &&
      typeof s.weight === 'number' &&
      typeof s.reps === 'number' &&
      isOptionalNumber(s.rpe) &&
      isOptionalNumber(s.restSeconds),
  )
}

function normalizeSession(session: SessionExercise[]): SessionExercise[] {
  return session.map((row) => ({
    ...row,
    sets: row.sets.map((s) => ({
      ...s,
      rpe: s.rpe ?? null,
      restSeconds: s.restSeconds ?? null,
    })),
  }))
}

/**
 * Interpreta lo leído del almacenamiento. Devuelve null ante cualquier
 * contenido corrupto o de un formato anterior, en vez de propagar basura.
 */
export function parseDraft(raw: string | null): WorkoutDraft | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null
  if (typeof parsed.savedAt !== 'string') return null
  if (!Array.isArray(parsed.sessionExercises)) return null
  if (!parsed.sessionExercises.every(isSessionExercise)) return null

  const notes = typeof parsed.notes === 'string' ? parsed.notes : ''

  return {
    savedAt: parsed.savedAt,
    sessionExercises: normalizeSession(parsed.sessionExercises),
    notes,
  }
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    // Navegación privada o almacenamiento bloqueado por el navegador.
    return null
  }
}

export function readWorkoutDraft(workoutId: string): WorkoutDraft | null {
  const store = storage()
  if (!store) return null
  try {
    return parseDraft(store.getItem(KEY_PREFIX + workoutId))
  } catch {
    return null
  }
}

export function saveWorkoutDraft(
  workoutId: string,
  sessionExercises: SessionExercise[],
  notes = '',
): void {
  const store = storage()
  if (!store) return
  const draft: WorkoutDraft = {
    savedAt: new Date().toISOString(),
    sessionExercises,
    notes,
  }
  try {
    store.setItem(KEY_PREFIX + workoutId, JSON.stringify(draft))
  } catch {
    // Sin espacio disponible: el entreno sigue en memoria, solo se pierde la copia.
  }
}

export function clearWorkoutDraft(workoutId: string): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(KEY_PREFIX + workoutId)
  } catch {
    // Nada que hacer si el navegador no deja borrar.
  }
}
