import { useCallback, useEffect, useState } from 'react'
import type { Exercise } from '../types/exercise'
import type { LocalSessionSet, SessionExercise } from '../types/workoutSession'
import type { WorkoutSetWithExercise } from '../types/workoutSet'
import { ensureExercise, listUserExercises } from '../services/exerciseService'
import { sessionExercisesFromWorkoutSets } from '../lib/sessionFromWorkoutSets'

function newLocalSetId(): string {
  return crypto.randomUUID()
}

export type AddSetResult =
  | { ok: true }
  | { ok: false; message: string }

export type UseWorkoutExercisesState = {
  catalog: Exercise[]
  sessionExercises: SessionExercise[]
  isCatalogLoading: boolean
  catalogError: string | null
  isAdding: boolean
  addError: string | null
  addExerciseByName: (rawName: string) => Promise<void>
  hydrateSessionFromSets: (sets: WorkoutSetWithExercise[]) => void
  seedSessionWithExercises: (exercises: Exercise[]) => void
  addSetToExercise: (
    exerciseId: string,
    weight: number,
    reps: number,
  ) => AddSetResult
}

/**
 * Catálogo del usuario (Supabase) + ejercicios y sets del workout actual (solo estado local).
 */
export function useWorkoutExercises(): UseWorkoutExercisesState {
  const [catalog, setCatalog] = useState<Exercise[]>([])
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(
    [],
  )
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsCatalogLoading(true)
    void (async () => {
      const result = await listUserExercises()
      if (cancelled) return
      if (result.ok) {
        setCatalog(result.exercises)
      } else {
        setCatalogError(result.message)
      }
      setIsCatalogLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addExerciseByName = useCallback(async (rawName: string) => {
    setAddError(null)
    setIsAdding(true)
    try {
      const result = await ensureExercise(rawName)
      if (!result.ok) {
        setAddError(result.message)
        return
      }

      const { exercise } = result

      setSessionExercises((prev) =>
        prev.some((row) => row.exercise.id === exercise.id)
          ? prev
          : [...prev, { exercise, sets: [] }],
      )

      setCatalog((prev) => {
        if (prev.some((e) => e.id === exercise.id)) {
          return prev
        }
        return [...prev, exercise].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        )
      })
    } finally {
      setIsAdding(false)
    }
  }, [])

  /**
   * Reemplaza la sesión con las series ya persistidas del entreno. Debe correr
   * antes de cualquier guardado: `replace_workout_sets` borra lo que no esté aquí.
   */
  const hydrateSessionFromSets = useCallback(
    (sets: WorkoutSetWithExercise[]) => {
      const hydrated = sessionExercisesFromWorkoutSets(sets)
      setSessionExercises(hydrated)
      setCatalog((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]))
        for (const row of hydrated) {
          byId.set(row.exercise.id, row.exercise)
        }
        return [...byId.values()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        )
      })
    },
    [],
  )

  const seedSessionWithExercises = useCallback((exercises: Exercise[]) => {
    if (exercises.length === 0) return
    setSessionExercises((prev) => {
      const existing = new Set(prev.map((r) => r.exercise.id))
      const additions = exercises
        .filter((e) => !existing.has(e.id))
        .map((exercise) => ({ exercise, sets: [] as LocalSessionSet[] }))
      return [...prev, ...additions]
    })
    setCatalog((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]))
      for (const e of exercises) {
        byId.set(e.id, e)
      }
      return [...byId.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
    })
  }, [])

  const addSetToExercise = useCallback(
    (exerciseId: string, weight: number, reps: number): AddSetResult => {
      if (!Number.isFinite(weight) || weight < 0) {
        return { ok: false, message: 'Indica un peso válido (≥ 0).' }
      }
      if (!Number.isInteger(reps) || reps < 1) {
        return {
          ok: false,
          message: 'Las repeticiones deben ser un entero ≥ 1.',
        }
      }

      const newSet: LocalSessionSet = {
        localId: newLocalSetId(),
        weight,
        reps,
      }

      setSessionExercises((prev) =>
        prev.map((row) =>
          row.exercise.id === exerciseId
            ? { ...row, sets: [...row.sets, newSet] }
            : row,
        ),
      )

      return { ok: true }
    },
    [],
  )

  return {
    catalog,
    sessionExercises,
    isCatalogLoading,
    catalogError,
    isAdding,
    addError,
    addExerciseByName,
    hydrateSessionFromSets,
    seedSessionWithExercises,
    addSetToExercise,
  }
}
