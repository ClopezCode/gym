import { supabase } from '../lib/supabaseClient'
import type { Exercise } from '../types/exercise'
import type {
  RoutineTemplate,
  RoutineTemplateWithExercises,
} from '../types/routineTemplate'

type ItemRowDb = {
  sort_order: number
  exercises: Exercise | Exercise[] | null
}

function normalizeExercise(
  raw: Exercise | Exercise[] | null,
): Exercise | null {
  if (raw == null) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

export type RoutineListSuccess = { ok: true; templates: RoutineTemplate[] }
export type RoutineListFailure = { ok: false; message: string }
export type RoutineListResult = RoutineListSuccess | RoutineListFailure

export async function listRoutineTemplates(): Promise<RoutineListResult> {
  const { data, error } = await supabase
    .from('routine_templates')
    .select('id, user_id, name, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, templates: (data ?? []) as RoutineTemplate[] }
}

export type RoutineDetailSuccess = { ok: true; template: RoutineTemplateWithExercises }
export type RoutineDetailFailure = { ok: false; message: string }
export type RoutineDetailResult = RoutineDetailSuccess | RoutineDetailFailure

export async function getRoutineTemplateWithExercises(
  templateId: string,
): Promise<RoutineDetailResult> {
  const { data: t, error: tErr } = await supabase
    .from('routine_templates')
    .select('id, user_id, name, created_at')
    .eq('id', templateId)
    .maybeSingle()

  if (tErr) {
    return { ok: false, message: tErr.message }
  }
  if (!t) {
    return { ok: false, message: 'Plantilla no encontrada.' }
  }

  const { data: items, error: iErr } = await supabase
    .from('routine_template_items')
    .select(
      `
      sort_order,
      exercises ( id, name, user_id, created_at )
    `,
    )
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })

  if (iErr) {
    return { ok: false, message: iErr.message }
  }

  const rows = (items ?? []) as ItemRowDb[]
  const parsed: RoutineTemplateWithExercises['items'] = []
  for (const row of rows) {
    const ex = normalizeExercise(row.exercises)
    if (ex) {
      parsed.push({ sort_order: row.sort_order, exercise: ex })
    }
  }

  return {
    ok: true,
    template: { ...(t as RoutineTemplate), items: parsed },
  }
}

export type RoutineCreateSuccess = { ok: true; templateId: string }
export type RoutineCreateFailure = { ok: false; message: string }
export type RoutineCreateResult = RoutineCreateSuccess | RoutineCreateFailure

/**
 * Crea plantilla y filas en orden. `exerciseIds` sin duplicados preservando orden.
 */
export async function createRoutineTemplate(
  name: string,
  exerciseIds: string[],
): Promise<RoutineCreateResult> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, message: 'El nombre de la plantilla no puede estar vacío.' }
  }
  if (exerciseIds.length === 0) {
    return { ok: false, message: 'Añade al menos un ejercicio.' }
  }

  const seen = new Set<string>()
  const uniqueIds = exerciseIds.filter((id) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

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

  const { data: tpl, error: insErr } = await supabase
    .from('routine_templates')
    .insert({ user_id: user.id, name: trimmed })
    .select('id')
    .single()

  if (insErr || !tpl) {
    return { ok: false, message: insErr?.message ?? 'No se pudo crear la plantilla.' }
  }

  const templateId = tpl.id as string
  const itemRows = uniqueIds.map((exercise_id, index) => ({
    template_id: templateId,
    exercise_id,
    sort_order: index,
  }))

  const { error: itemsErr } = await supabase
    .from('routine_template_items')
    .insert(itemRows)

  if (itemsErr) {
    await supabase.from('routine_templates').delete().eq('id', templateId)
    return { ok: false, message: itemsErr.message }
  }

  return { ok: true, templateId }
}

export type RoutineDeleteResult =
  | { ok: true }
  | { ok: false; message: string }

export async function deleteRoutineTemplate(
  templateId: string,
): Promise<RoutineDeleteResult> {
  const { error } = await supabase
    .from('routine_templates')
    .delete()
    .eq('id', templateId)

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true }
}
