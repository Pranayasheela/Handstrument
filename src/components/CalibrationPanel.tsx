import { Crosshair, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  DEFAULT_CALIBRATION,
  FINGER_SENSITIVITY_RANGE,
  finalizeRange,
  isCalibrated,
  type Range,
} from '../domain/calibration'
import { useRaveStore } from '../store/useRaveStore'

const MIN_SAMPLES = 30

type Draft = { height: Range; x: Range; spread: Range; samples: number }

function freshDraft(): Draft {
  return {
    height: { min: 1, max: 0 },
    x: { min: 1, max: 0 },
    spread: { min: 1, max: 0 },
    samples: 0,
  }
}

function widen(range: Range, value: number): Range {
  return { min: Math.min(range.min, value), max: Math.max(range.max, value) }
}

export function CalibrationPanel() {
  const status = useRaveStore((state) => state.status)
  const calibration = useRaveStore((state) => state.calibration)
  const setCalibration = useRaveStore((state) => state.setCalibration)

  const tracking = status === 'tracking'
  const [calibrating, setCalibrating] = useState(false)
  const [draft, setDraft] = useState<Draft>(freshDraft)

  useEffect(() => {
    if (!calibrating) {
      return
    }

    let frame = 0

    const tick = () => {
      if (useRaveStore.getState().status !== 'tracking') {
        setCalibrating(false)
        return
      }

      const hands = useRaveStore
        .getState()
        .signal.hands.filter((hand) => hand.score > 0.4)

      if (hands.length > 0) {
        setDraft((prev) => {
          let next = prev
          for (const hand of hands) {
            next = {
              height: widen(next.height, hand.rawMotion.height),
              x: widen(next.x, hand.rawMotion.x),
              spread: widen(next.spread, hand.rawMotion.spread),
              samples: next.samples + 1,
            }
          }
          return next
        })
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [calibrating])

  const ready = draft.samples >= MIN_SAMPLES

  const begin = () => {
    setDraft(freshDraft())
    setCalibrating(true)
  }

  const save = () => {
    setCalibration({
      ...calibration,
      height: finalizeRange(draft.height),
      x: finalizeRange(draft.x),
      spread: finalizeRange(draft.spread),
    })
    setCalibrating(false)
  }

  return (
    <section className="studio-panel" aria-label="Gesture calibration">
      <div className="studio-panel-head">
        <span className="panel-kicker">
          <Crosshair size={15} />
          Gesture calibration
        </span>
        {isCalibrated(calibration) ? <span className="studio-tag">Custom</span> : null}
      </div>

      {!tracking ? (
        <p className="studio-note">Start the camera to calibrate your hand range.</p>
      ) : calibrating ? (
        <>
          <p className="studio-note">
            Move both hands through everything you want to use — reach high and
            low, sweep left and right, open and close your hands.
          </p>
          <CalibBar label="Up / down" range={draft.height} />
          <CalibBar label="Left / right" range={draft.x} />
          <CalibBar label="Open / closed" range={draft.spread} />
          <div className="studio-actions">
            <button
              className="primary-action"
              disabled={!ready}
              onClick={save}
              type="button"
            >
              {ready ? 'Save range' : 'Keep moving…'}
            </button>
            <button
              className="ghost-action"
              onClick={() => setCalibrating(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="studio-note">
            Records how far your hands actually move on camera and stretches that
            to the full range, so framing and hand size stop mattering.
          </p>
          <button className="primary-action" onClick={begin} type="button">
            {isCalibrated(calibration) ? 'Re-calibrate range' : 'Calibrate range'}
          </button>
        </>
      )}

      <label className="studio-slider">
        <span>Finger sensitivity</span>
        <input
          max={FINGER_SENSITIVITY_RANGE.max}
          min={FINGER_SENSITIVITY_RANGE.min}
          onChange={(event) =>
            setCalibration({
              ...calibration,
              fingerSensitivity: Number(event.target.value),
            })
          }
          step={FINGER_SENSITIVITY_RANGE.step}
          type="range"
          value={calibration.fingerSensitivity}
        />
        <small>
          {calibration.fingerSensitivity <= 0.8
            ? 'Fingers register easily'
            : calibration.fingerSensitivity >= 1.3
              ? 'Needs a clear open finger'
              : 'Balanced'}
        </small>
      </label>

      {isCalibrated(calibration) ? (
        <button
          className="ghost-action"
          onClick={() => setCalibration(DEFAULT_CALIBRATION)}
          type="button"
        >
          <RotateCcw size={14} />
          Reset to default
        </button>
      ) : null}
    </section>
  )
}

function CalibBar({ label, range }: { label: string; range: Range }) {
  const has = range.max > range.min
  const left = has ? range.min * 100 : 0
  const width = has ? (range.max - range.min) * 100 : 0

  return (
    <div className="calib-bar">
      <span>{label}</span>
      <div className="calib-track" aria-hidden="true">
        <span style={{ left: `${left}%`, width: `${width}%` }} />
      </div>
      <small>{has ? `${Math.round(left)}–${Math.round(left + width)}%` : '—'}</small>
    </div>
  )
}
