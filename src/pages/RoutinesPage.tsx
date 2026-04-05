import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listUserExercises } from '../services/exerciseService'
import {
  createRoutineTemplate,
  deleteRoutineTemplate,
  listRoutineTemplates,
} from '../services/routineTemplateService'
import { createWorkout } from '../services/workoutService'
import type { Exercise } from '../types/exercise'
import type { RoutineTemplate } from '../types/routineTemplate'
import './RoutinesPage.css'

export function RoutinesPage() {
  const navigate = useNavigate()
  const listId = useId()

  const [templates, setTemplates] = useState<RoutineTemplate[]>([])
  const [catalog, setCatalog] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [draftExerciseIds, setDraftExerciseIds] = useState<string[]>([])
  const [pickerValue, setPickerValue] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)

  async function refreshTemplates() {
    const res = await listRoutineTemplates()
    if (res.ok) {
      setTemplates(res.templates)
    } else {
      setListError(res.message)
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setIsLoading(true)
      setListError(null)
      const [tRes, cRes] = await Promise.all([
        listRoutineTemplates(),
        listUserExercises(),
      ])
      if (cancelled) return
      if (tRes.ok) {
        setTemplates(tRes.templates)
      } else {
        setListError(tRes.message)
      }
      if (cRes.ok) {
        setCatalog(cRes.exercises)
      }
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function addExerciseToDraftById(exerciseId: string) {
    if (!exerciseId || draftExerciseIds.includes(exerciseId)) return
    setDraftExerciseIds((prev) => [...prev, exerciseId])
    setPickerValue('')
  }

  function addExerciseToDraftFromName() {
    const name = pickerValue.trim()
    if (!name) return
    const found = catalog.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    )
    if (found) {
      addExerciseToDraftById(found.id)
    }
  }

  function removeDraftAt(index: number) {
    setDraftExerciseIds((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleCreateTemplate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateError(null)
    setIsCreating(true)
    try {
      const res = await createRoutineTemplate(newName, draftExerciseIds)
      if (!res.ok) {
        setCreateError(res.message)
        return
      }
      setNewName('')
      setDraftExerciseIds([])
      await refreshTemplates()
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta plantilla?')) return
    setDeletingId(id)
    const res = await deleteRoutineTemplate(id)
    setDeletingId(null)
    if (!res.ok) {
      setListError(res.message)
      return
    }
    await refreshTemplates()
  }

  async function handleStartWithTemplate(templateId: string) {
    setStartingId(templateId)
    try {
      const w = await createWorkout()
      if (!w.ok) {
        setListError(w.message)
        return
      }
      navigate(`/workouts/${w.workout.id}`, {
        state: { templateId },
      })
    } finally {
      setStartingId(null)
    }
  }

  function draftExerciseName(id: string): string {
    return catalog.find((e) => e.id === id)?.name ?? id
  }

  return (
    <main className="routines-page">
      <header className="routines-page__header">
        <div>
          <h1 className="routines-page__title">Plantillas</h1>
          <p className="routines-page__subtitle">
            Listas reutilizables; al entrenar se cargan sin series.
          </p>
        </div>
        <Link className="routines-page__back" to="/">
          ← Inicio
        </Link>
      </header>

      {listError ? (
        <p className="routines-page__error" role="alert">
          {listError}
        </p>
      ) : null}

      <section className="routines-page__section" aria-labelledby="new-template">
        <h2 id="new-template" className="routines-page__section-title">
          Nueva plantilla
        </h2>
        <form className="routines-page__form" onSubmit={handleCreateTemplate}>
          <label className="routines-page__label" htmlFor="tpl-name">
            Nombre
          </label>
          <input
            id="tpl-name"
            className="routines-page__input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej. Tren superior"
            required
            disabled={isCreating}
          />

          <label className="routines-page__label" htmlFor="tpl-ex-pick">
            Añadir ejercicio
          </label>
          <div className="routines-page__picker-row">
            <input
              id="tpl-ex-pick"
              className="routines-page__input"
              list={listId}
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
              placeholder="Buscar en tu catálogo"
              disabled={isCreating}
            />
            <datalist id={listId}>
              {catalog.map((ex) => (
                <option key={ex.id} value={ex.name} />
              ))}
            </datalist>
            <button
              type="button"
              className="routines-page__btn-secondary"
              onClick={addExerciseToDraftFromName}
              disabled={isCreating || pickerValue.trim() === ''}
            >
              Añadir
            </button>
          </div>

          {draftExerciseIds.length > 0 ? (
            <ol className="routines-page__draft-list">
              {draftExerciseIds.map((id, index) => (
                <li key={`${id}-${index}`} className="routines-page__draft-item">
                  <span>{draftExerciseName(id)}</span>
                  <button
                    type="button"
                    className="routines-page__draft-remove"
                    onClick={() => removeDraftAt(index)}
                    disabled={isCreating}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="routines-page__hint">Orden: el de tu rutina.</p>
          )}

          {createError ? (
            <p className="routines-page__error" role="alert">
              {createError}
            </p>
          ) : null}

          <button
            type="submit"
            className="routines-page__submit"
            disabled={isCreating || draftExerciseIds.length === 0}
          >
            {isCreating ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </form>
      </section>

      <section className="routines-page__section" aria-labelledby="list-templates">
        <h2 id="list-templates" className="routines-page__section-title">
          Tus plantillas
        </h2>
        {isLoading ? (
          <p className="routines-page__status">Cargando…</p>
        ) : templates.length === 0 ? (
          <p className="routines-page__empty">Ninguna plantilla guardada.</p>
        ) : (
          <ul className="routines-page__list">
            {templates.map((t) => (
              <li key={t.id} className="routines-page__card">
                <div className="routines-page__card-main">
                  <span className="routines-page__card-name">{t.name}</span>
                </div>
                <div className="routines-page__card-actions">
                  <button
                    type="button"
                    className="routines-page__primary"
                    onClick={() => handleStartWithTemplate(t.id)}
                    disabled={startingId !== null || deletingId !== null}
                  >
                    {startingId === t.id ? 'Abriendo…' : 'Usar plantilla'}
                  </button>
                  <button
                    type="button"
                    className="routines-page__btn-danger"
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId !== null || startingId !== null}
                  >
                    {deletingId === t.id ? '…' : 'Eliminar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
