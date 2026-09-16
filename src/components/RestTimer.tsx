import './RestTimer.css'

type RestTimerProps = {
  secondsLeft: number
  totalSeconds: number
  onSkip: () => void
  onAdjust: (delta: number) => void
}

function formatRest(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function RestTimer({
  secondsLeft,
  totalSeconds,
  onSkip,
  onAdjust,
}: RestTimerProps) {
  const done = secondsLeft <= 0
  const pct =
    totalSeconds > 0 ? Math.min(100, Math.max(0, (secondsLeft / totalSeconds) * 100)) : 0

  return (
    <div
      className={`rest-timer${done ? ' rest-timer--done' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="rest-timer__row">
        <p className="rest-timer__label">{done ? 'Descanso listo' : 'Descanso'}</p>
        <p className="rest-timer__clock">{formatRest(secondsLeft)}</p>
      </div>
      <div className="rest-timer__bar" aria-hidden>
        <span className="rest-timer__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="rest-timer__actions">
        <button type="button" className="rest-timer__btn" onClick={() => onAdjust(-15)}>
          −15 s
        </button>
        <button type="button" className="rest-timer__btn" onClick={() => onAdjust(15)}>
          +15 s
        </button>
        <button type="button" className="rest-timer__skip" onClick={onSkip}>
          Listo
        </button>
      </div>
    </div>
  )
}
