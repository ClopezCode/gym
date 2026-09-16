/** Epley: 1RM ≈ peso × (1 + reps / 30). Una repetición es el peso tal cual. */
export function estimatedOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight < 0) return null
  if (!Number.isInteger(reps) || reps < 1) return null
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/** Mejor 1RM estimado de una lista de series. */
export function bestEstimatedOneRepMax(
  sets: Array<{ weight: number; reps: number }>,
): number | null {
  let best: number | null = null
  for (const s of sets) {
    const e1 = estimatedOneRepMax(s.weight, s.reps)
    if (e1 == null) continue
    if (best == null || e1 > best) best = e1
  }
  return best
}

export function formatEstimated1RM(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Math.round(value)} kg`
}
