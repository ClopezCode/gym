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
