export type CalendarCell = {
  date: string
  day: number
  inMonth: boolean
}

/** Lunes-primero, 6 filas fijas. `month` es 0-index (Date). */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startOffset)
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      date: toISODate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    })
  }
  return cells
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function monthTitle(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  })
}
