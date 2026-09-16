import { describe, expect, it } from 'vitest'
import { monthGrid, toISODate } from './calendarMonth'

describe('monthGrid', () => {
  it('devuelve 42 celdas y arranca en lunes', () => {
    const cells = monthGrid(2026, 8)
    expect(cells).toHaveLength(42)
    const first = new Date(2026, 8, 1)
    expect((first.getDay() + 6) % 7).toBeGreaterThanOrEqual(0)
    const start = new Date(cells[0].date + 'T00:00:00')
    expect(start.getDay()).toBe(1)
  })

  it('marca los días del mes pedido', () => {
    const cells = monthGrid(2026, 8)
    const inMonth = cells.filter((c) => c.inMonth)
    expect(inMonth).toHaveLength(30)
    expect(inMonth[0].date).toBe('2026-09-01')
  })
})

describe('toISODate', () => {
  it('formatea sin UTC', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
