/** Volumen de entreno: suma de peso × reps (unidades: kg·rep). */
export function setVolumeKgReps(weight: number, reps: number): number {
  return weight * reps
}

/** Lunes ISO de la semana calendario que contiene `dateStr` (YYYY-MM-DD local). */
export function weekStartMondayKey(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return dateStr
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export type WeeklyVolumePoint = {
  weekKey: string
  label: string
  volume: number
}

export type ExerciseSessionVolumePoint = {
  workoutId: string
  workoutDate: string
  label: string
  volume: number
}

type SetRowInput = {
  weight: number
  reps: number
  workoutDate: string
}

export function aggregateWeeklyVolume(
  rows: SetRowInput[],
  weekStartsDesc: string[],
): WeeklyVolumePoint[] {
  const map = new Map<string, number>()
  for (const wk of weekStartsDesc) {
    map.set(wk, 0)
  }
  for (const row of rows) {
    const key = weekStartMondayKey(row.workoutDate)
    if (!map.has(key)) continue
    map.set(key, map.get(key)! + setVolumeKgReps(row.weight, row.reps))
  }
  return weekStartsDesc.map((weekKey) => ({
    weekKey,
    label: formatWeekLabel(weekKey),
    volume: map.get(weekKey) ?? 0,
  }))
}

function formatWeekLabel(weekKey: string): string {
  const [y, m, d] = weekKey.split('-').map(Number)
  if (!y || !m || !d) return weekKey
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
  })
}

/** Últimos N lunes (clave) de más antiguo a más reciente. */
export function lastNWeekMondayKeys(n: number): string[] {
  const out: string[] = []
  const today = new Date()
  const cursor = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const day = cursor.getDay()
  const diff = day === 0 ? -6 : 1 - day
  cursor.setDate(cursor.getDate() + diff)
  for (let i = n - 1; i >= 0; i--) {
    const c = new Date(cursor)
    c.setDate(c.getDate() - i * 7)
    const yy = c.getFullYear()
    const mm = String(c.getMonth() + 1).padStart(2, '0')
    const dd = String(c.getDate()).padStart(2, '0')
    out.push(`${yy}-${mm}-${dd}`)
  }
  return out
}

type ExerciseSetInput = {
  weight: number
  reps: number
  workoutId: string
  workoutDate: string
}

export function aggregateExerciseVolumeBySession(
  rows: ExerciseSetInput[],
  maxSessions: number,
): ExerciseSessionVolumePoint[] {
  const byWorkout = new Map<
    string,
    { workoutDate: string; volume: number }
  >()
  for (const row of rows) {
    const cur = byWorkout.get(row.workoutId)
    const add = setVolumeKgReps(row.weight, row.reps)
    if (cur) {
      cur.volume += add
    } else {
      byWorkout.set(row.workoutId, {
        workoutDate: row.workoutDate,
        volume: add,
      })
    }
  }
  const sorted = [...byWorkout.entries()].sort((a, b) =>
    b[1].workoutDate.localeCompare(a[1].workoutDate),
  )
  const sliced = sorted.slice(0, maxSessions).reverse()
  return sliced.map(([workoutId, v]) => ({
    workoutId,
    workoutDate: v.workoutDate,
    label: formatShortDate(v.workoutDate),
    volume: v.volume,
  }))
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
  })
}
