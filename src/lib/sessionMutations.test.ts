import { beforeEach, describe, expect, it } from 'vitest'
import {
  removeExerciseFromSession,
  removeSetFromSession,
  updateSetInSession,
} from './sessionMutations'
import type { Exercise } from '../types/exercise'
import type { SessionExercise } from '../types/workoutSession'

function exercise(id: string, name: string): Exercise {
  return { id, name, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' }
}

const press = exercise('ex-1', 'Press banca')
const sentadilla = exercise('ex-2', 'Sentadilla')

let session: SessionExercise[]

beforeEach(() => {
  session = [
    {
      exercise: press,
      sets: [
        { localId: 'a', weight: 60, reps: 10 },
        { localId: 'b', weight: 62.5, reps: 8 },
      ],
    },
    {
      exercise: sentadilla,
      sets: [{ localId: 'c', weight: 100, reps: 5 }],
    },
  ]
})

describe('updateSetInSession', () => {
  it('cambia el peso y las repeticiones de la serie indicada', () => {
    const result = updateSetInSession(session, 'ex-1', 'b', 65, 6)

    expect(result[0].sets[1]).toEqual({ localId: 'b', weight: 65, reps: 6 })
  })

  it('no toca las demás series ni los demás ejercicios', () => {
    const result = updateSetInSession(session, 'ex-1', 'b', 65, 6)

    expect(result[0].sets[0]).toEqual({ localId: 'a', weight: 60, reps: 10 })
    expect(result[1].sets).toEqual([{ localId: 'c', weight: 100, reps: 5 }])
  })

  it('no modifica la sesión original', () => {
    updateSetInSession(session, 'ex-1', 'b', 65, 6)

    expect(session[0].sets[1]).toEqual({ localId: 'b', weight: 62.5, reps: 8 })
  })

  it('devuelve la sesión intacta si la serie no existe', () => {
    const result = updateSetInSession(session, 'ex-1', 'inexistente', 65, 6)

    expect(result[0].sets).toEqual(session[0].sets)
  })
})

describe('removeSetFromSession', () => {
  it('elimina solo la serie indicada', () => {
    const result = removeSetFromSession(session, 'ex-1', 'a')

    expect(result[0].sets).toEqual([{ localId: 'b', weight: 62.5, reps: 8 }])
  })

  it('conserva el ejercicio aunque se quede sin series', () => {
    let result = removeSetFromSession(session, 'ex-2', 'c')

    expect(result).toHaveLength(2)
    expect(result[1].exercise).toEqual(sentadilla)
    expect(result[1].sets).toEqual([])

    result = removeSetFromSession(result, 'ex-2', 'c')
    expect(result[1].sets).toEqual([])
  })

  it('no modifica la sesión original', () => {
    removeSetFromSession(session, 'ex-1', 'a')

    expect(session[0].sets).toHaveLength(2)
  })
})

describe('removeExerciseFromSession', () => {
  it('elimina el ejercicio y todas sus series', () => {
    const result = removeExerciseFromSession(session, 'ex-1')

    expect(result).toHaveLength(1)
    expect(result[0].exercise).toEqual(sentadilla)
  })

  it('devuelve la sesión intacta si el ejercicio no está', () => {
    const result = removeExerciseFromSession(session, 'inexistente')

    expect(result).toHaveLength(2)
  })

  it('no modifica la sesión original', () => {
    removeExerciseFromSession(session, 'ex-1')

    expect(session).toHaveLength(2)
  })
})
