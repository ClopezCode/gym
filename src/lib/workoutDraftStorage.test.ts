import { describe, expect, it } from 'vitest'
import { parseDraft, sessionSignature } from './workoutDraftStorage'
import type { Exercise } from '../types/exercise'
import type { SessionExercise } from '../types/workoutSession'

function exercise(id: string, name: string): Exercise {
  return { id, name, user_id: 'user-1', created_at: '2026-01-01T00:00:00Z' }
}

const session: SessionExercise[] = [
  {
    exercise: exercise('ex-1', 'Press banca'),
    sets: [
      { localId: 'a', weight: 60, reps: 10 },
      { localId: 'b', weight: 62.5, reps: 8 },
    ],
  },
]

describe('sessionSignature', () => {
  it('ignora los identificadores locales', () => {
    const renamed: SessionExercise[] = [
      {
        exercise: exercise('ex-1', 'Press banca'),
        sets: [
          { localId: 'otro-1', weight: 60, reps: 10 },
          { localId: 'otro-2', weight: 62.5, reps: 8 },
        ],
      },
    ]

    expect(sessionSignature(renamed)).toBe(sessionSignature(session))
  })

  it('cambia si cambia el peso o las repeticiones', () => {
    const edited: SessionExercise[] = [
      {
        exercise: exercise('ex-1', 'Press banca'),
        sets: [
          { localId: 'a', weight: 65, reps: 10 },
          { localId: 'b', weight: 62.5, reps: 8 },
        ],
      },
    ]

    expect(sessionSignature(edited)).not.toBe(sessionSignature(session))
  })

  it('cambia si se elimina una serie', () => {
    const shorter: SessionExercise[] = [
      {
        exercise: exercise('ex-1', 'Press banca'),
        sets: [{ localId: 'a', weight: 60, reps: 10 }],
      },
    ]

    expect(sessionSignature(shorter)).not.toBe(sessionSignature(session))
  })

  it('distingue una sesión vacía de una con series', () => {
    expect(sessionSignature([])).not.toBe(sessionSignature(session))
  })
})

describe('parseDraft', () => {
  it('devuelve null si no hay nada guardado', () => {
    expect(parseDraft(null)).toBeNull()
    expect(parseDraft('')).toBeNull()
  })

  it('devuelve null si el contenido no es JSON válido', () => {
    expect(parseDraft('{esto no es json')).toBeNull()
  })

  it('devuelve null si faltan campos esperados', () => {
    expect(parseDraft(JSON.stringify({ sessionExercises: [] }))).toBeNull()
    expect(parseDraft(JSON.stringify({ savedAt: '2026-01-01' }))).toBeNull()
  })

  it('devuelve null si una serie tiene tipos incorrectos', () => {
    const corrupt = {
      savedAt: '2026-01-01T00:00:00Z',
      sessionExercises: [
        {
          exercise: { id: 'ex-1', name: 'Press banca' },
          sets: [{ localId: 'a', weight: '60', reps: 10 }],
        },
      ],
    }

    expect(parseDraft(JSON.stringify(corrupt))).toBeNull()
  })

  it('recupera un borrador bien formado', () => {
    const raw = JSON.stringify({
      savedAt: '2026-01-01T00:00:00Z',
      sessionExercises: session,
    })

    const draft = parseDraft(raw)

    expect(draft?.savedAt).toBe('2026-01-01T00:00:00Z')
    expect(sessionSignature(draft?.sessionExercises ?? [])).toBe(
      sessionSignature(session),
    )
  })
})
