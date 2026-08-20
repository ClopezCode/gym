import { useCallback, useEffect, useState } from 'react'
import type { Exercise } from '../types/exercise'
import type { LocalSessionSet, SessionExercise } from '../types/workoutSession'
import { ensureExercise, listUserExercises } from '../services/exerciseService'
import {
  removeExerciseFromSession,
  removeSetFromSession,
  updateSetInSession,
} from '../lib/sessionMutations'

function newLocalSetId(): string {
  return crypto.randomUUID()
}

export type AddSetResult =
  | { ok: true }
  | { ok: false; message: string }

function validateSetValues(weight: number, reps: number): AddSetResult {
  if (!Number.isFinite(weight) || weight < 0) {
    return { ok: false, message: 'Indica un peso válido (≥ 0).' }
  }
  if (!Number.isInteger(reps) || reps < 1) {
    return { ok: false, message: 'Las repeticiones deben ser un entero ≥ 1.' }
  }
  return { ok: true }
}

export type UseWorkoutExercisesState = {
  catalog: Exercise[]
  sessionExercises: SessionExercise[]
  isCatalogLoading: boolean
  catalogError: string | null
  isAdding: boolean
  addError: string | null
  addExerciseByName: (rawName: string) => Promise<void>
  hydrateSession: (session: SessionExercise[]) => void
  seedSessionWithExercises: (exercises: Exercise[]) => void
  addSetToExercise: (
    exerciseId: string,
    weight: number,
    reps: number,
  ) => AddSetResult
  updateSetInExercise: (
    exerciseId: string,
    localId: string,
    weight: number,
    reps: number,
  ) => AddSetResult
  removeSetFromExercise: (exerciseId: string, localId: string) => void
  removeExerciseFromSession: (exerciseId: string) => void
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
   * Reemplaza por completo la sesión, ya venga de la base de datos o de un
   * borrador local. Debe correr antes de cualquier guardado:
   * `replace_workout_sets` borra del entreno todo lo que no esté aquí.
   */
  const hydrateSession = useCallback((session: SessionExercise[]) => {
    setSessionExercises(session)
    setCatalog((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]))
      for (const row of session) {
        byId.set(row.exercise.id, row.exercise)
      }
      return [...byId.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
    })
  }, [])

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
      const validation = validateSetValues(weight, reps)
      if (!validation.ok) {
        return validation
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

  const updateSetInExercise = useCallback(
    (
      exerciseId: string,
      localId: string,
      weight: number,
      reps: number,
    ): AddSetResult => {
      const validation = validateSetValues(weight, reps)
      if (!validation.ok) {
        return validation
      }

      setSessionExercises((prev) =>
        updateSetInSession(prev, exerciseId, localId, weight, reps),
      )

      return { ok: true }
    },
    [],
  )

  const removeSetFromExercise = useCallback(
    (exerciseId: string, localId: string) => {
      setSessionExercises((prev) =>
        removeSetFromSession(prev, exerciseId, localId),
      )
    },
    [],
  )

  const removeExercise = useCallback((exerciseId: string) => {
    setSessionExercises((prev) => removeExerciseFromSession(prev, exerciseId))
  }, [])

  return {
    catalog,
    sessionExercises,
    isCatalogLoading,
    catalogError,
    isAdding,
    addError,
    addExerciseByName,
    hydrateSession,
    seedSessionWithExercises,
    addSetToExercise,
    updateSetInExercise,
    removeSetFromExercise,
    removeExerciseFromSession: removeExercise,
  }
}
