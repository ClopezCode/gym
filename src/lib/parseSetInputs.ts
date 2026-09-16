/** Acepta coma o punto como separador decimal. */
export function parseWeightInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function parseRepsInput(raw: string): number | null {
  const normalized = raw.trim()
  if (normalized === '') return null
  const n = parseInt(normalized, 10)
  return Number.isInteger(n) ? n : null
}

/** RPE opcional 1–10. Vacío → null. */
export function parseRpeInput(raw: string): number | null | undefined {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const n = Number(normalized)
  if (!Number.isFinite(n)) return undefined
  if (n < 1 || n > 10) return undefined
  return n
}
