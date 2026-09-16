function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Duración transcurrida (ms) como m:ss o h:mm:ss. */
export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${pad2(m)}:${pad2(s)}`
  }
  return `${m}:${pad2(s)}`
}

export function elapsedMs(startedAt: string | null | undefined, endedAt?: string | null): number {
  if (!startedAt) return 0
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return 0
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  if (Number.isNaN(end)) return 0
  return Math.max(0, end - start)
}
