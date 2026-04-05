/** Formatea `YYYY-MM-DD` sin corrimientos por zona horaria. */
export function formatWorkoutDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) {
    return isoDate
  }
  return new Date(y, m - 1, d).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
