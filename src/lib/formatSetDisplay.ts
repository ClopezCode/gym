export function formatSetDisplay(
  weight: number,
  reps: number,
  rpe?: number | null,
): string {
  const base = `${weight} kg × ${reps}`
  if (rpe == null) return base
  return `${base} @ RPE ${rpe}`
}
