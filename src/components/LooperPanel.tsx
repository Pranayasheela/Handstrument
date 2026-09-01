import { Repeat } from 'lucide-react'
import { useEffect, useState } from 'react'
import * as Tone from 'tone'
import { useRaveStore } from '../store/useRaveStore'

const BAR_OPTIONS = [1, 2, 4]

type LooperPanelProps = {
  onArm: () => void
  onClear: () => void
}

export function LooperPanel({ onArm, onClear }: LooperPanelProps) {
  const audioReady = useRaveStore((state) => state.audioReady)
  const looperState = useRaveStore((state) => state.looperState)
  const looperBars = useRaveStore((state) => state.looperBars)
  const setLooperBars = useRaveStore((state) => state.setLooperBars)

  const [progress, setProgress] = useState(0)
  const running = looperState === 'recording' || looperState === 'playing'

  useEffect(() => {
    if (!running) {
      return
    }

    let frame = 0
    const loopTicks = looperBars * Tone.Transport.PPQ * 4

    const tick = () => {
      setProgress((Tone.Transport.ticks % loopTicks) / loopTicks || 0)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, looperBars])

  return (
    <section className="studio-panel" aria-label="Rhythm looper">
      <div className="studio-panel-head">
        <span className="panel-kicker">
          <Repeat size={15} />
          Rhythm looper
        </span>
        {looperState === 'recording' ? (
          <span className="rec-dot" aria-hidden="true" />
        ) : null}
      </div>

      <p className="studio-note">
        Records your left-hand drums for a set number of bars, then loops them so
        your hands are free for chords and fills.
      </p>

      <div className="segmented" role="group" aria-label="Loop length">
        {BAR_OPTIONS.map((bars) => (
          <button
            aria-pressed={looperBars === bars}
            className={looperBars === bars ? 'segmented-item active' : 'segmented-item'}
            disabled={looperState !== 'idle'}
            key={bars}
            onClick={() => setLooperBars(bars)}
            type="button"
          >
            {bars} bar{bars > 1 ? 's' : ''}
          </button>
        ))}
      </div>

      {running ? (
        <div className="calib-track" aria-hidden="true">
          <span style={{ left: 0, width: `${Math.round(progress * 100)}%` }} />
        </div>
      ) : null}

      {looperState === 'idle' ? (
        <>
          <button
            className="primary-action"
            disabled={!audioReady}
            onClick={onArm}
            type="button"
          >
            Record loop
          </button>
          {!audioReady ? (
            <p className="studio-note">Start audio first.</p>
          ) : null}
        </>
      ) : looperState === 'armed' ? (
        <div className="studio-actions">
          <span className="studio-status">Waiting for the next bar…</span>
          <button className="ghost-action" onClick={onClear} type="button">
            Cancel
          </button>
        </div>
      ) : looperState === 'recording' ? (
        <div className="studio-actions">
          <span className="studio-status">Recording — hold your drums</span>
          <button className="ghost-action" onClick={onClear} type="button">
            Cancel
          </button>
        </div>
      ) : (
        <div className="studio-actions">
          <span className="studio-status">
            Looping {looperBars} bar{looperBars > 1 ? 's' : ''} — hands are free
          </span>
          <button className="ghost-action" onClick={onClear} type="button">
            Clear loop
          </button>
        </div>
      )}
    </section>
  )
}
