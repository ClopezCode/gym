import { describe, expect, it } from 'vitest'
import { sessionExercisesFromWorkoutSets } from './sessionFromWorkoutSets'
import type { Exercise } from '../types/exercise'
import type { WorkoutSetWithExercise } from '../types/workoutSet'

function exercise(id: string, name: string): Exercise {
  return { id, name, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' }
}

function set(
  id: string,
  ex: Exercise | null,
  weight: number,
  reps: number,
): WorkoutSetWithExercise {
  return {
    id,
    workout_id: 'workout-1',
    exercise_id: ex?.id ?? null,
    weight,
    reps,
    created_at: `2026-01-01T00:00:0${id}Z`,
    exercise: ex,
  }
}

describe('sessionExercisesFromWorkoutSets', () => {
  it('devuelve una lista vacía cuando el entreno no tiene series', () => {
    expect(sessionExercisesFromWorkoutSets([])).toEqual([])
  })

  it('agrupa las series por ejercicio', () => {
    const press = exercise('ex-1', 'Press banca')
    const sentadilla = exercise('ex-2', 'Sentadilla')

    const result = sessionExercisesFromWorkoutSets([
      set('1', press, 60, 10),
      set('2', sentadilla, 100, 5),
      set('3', press, 62.5, 8),
    ])

    expect(result).toHaveLength(2)
    expect(result[0].exercise).toEqual(press)
    expect(result[0].sets).toHaveLength(2)
    expect(result[1].exercise).toEqual(sentadilla)
    expect(result[1].sets).toHaveLength(1)
  })

  it('respeta el orden de llegada de ejercicios y de series', () => {
    const press = exercise('ex-1', 'Press banca')
    const sentadilla = exercise('ex-2', 'Sentadilla')

    const result = sessionExercisesFromWorkoutSets([
      set('1', sentadilla, 100, 5),
      set('2', press, 60, 10),
      set('3', press, 62.5, 8),
    ])

    expect(result.map((r) => r.exercise.id)).toEqual(['ex-2', 'ex-1'])
    expect(result[1].sets.map((s) => s.weight)).toEqual([60, 62.5])
  })

  it('conserva peso y repeticiones de cada serie', () => {
    const press = exercise('ex-1', 'Press banca')

    const [row] = sessionExercisesFromWorkoutSets([set('1', press, 62.5, 8)])

    expect(row.sets[0]).toMatchObject({ weight: 62.5, reps: 8 })
  })

  it('descarta las series que no tienen ejercicio asociado', () => {
    const press = exercise('ex-1', 'Press banca')

    const result = sessionExercisesFromWorkoutSets([
      set('1', null, 40, 12),
      set('2', press, 60, 10),
    ])

    expect(result).toHaveLength(1)
    expect(result[0].exercise.id).toBe('ex-1')
  })

  it('asigna un localId distinto a cada serie', () => {
    const press = exercise('ex-1', 'Press banca')

    const [row] = sessionExercisesFromWorkoutSets([
      set('1', press, 60, 10),
      set('2', press, 60, 10),
      set('3', press, 60, 10),
    ])

    const ids = row.sets.map((s) => s.localId)
    expect(new Set(ids).size).toBe(3)
  })
})
