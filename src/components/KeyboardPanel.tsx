import { Keyboard } from 'lucide-react'
import { KEYBOARD_LAYOUT } from '../hooks/useKeyboardControls'
import { useRaveStore } from '../store/useRaveStore'

type KeyboardPanelProps = {
  onStartAudio: () => Promise<void>
}

export function KeyboardPanel({ onStartAudio }: KeyboardPanelProps) {
  const keyboardEnabled = useRaveStore((state) => state.keyboardEnabled)
  const setKeyboardEnabled = useRaveStore((state) => state.setKeyboardEnabled)
  const audioReady = useRaveStore((state) => state.audioReady)
  const status = useRaveStore((state) => state.status)

  const cameraActive = status === 'tracking' || status === 'loading'

  return (
    <section className="studio-panel" aria-label="Keyboard mode">
      <div className="studio-panel-head">
        <span className="panel-kicker">
          <Keyboard size={15} />
          Keyboard mode
        </span>
        <label className="studio-switch">
          <input
            checked={keyboardEnabled}
            onChange={(event) => setKeyboardEnabled(event.target.checked)}
            type="checkbox"
          />
          <span>{keyboardEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      <p className="studio-note">
        Play without a webcam. Active only while the camera is off.
      </p>

      <div className="key-legend">
        {KEYBOARD_LAYOUT.map((row) => (
          <div className="key-legend-row" key={row.label}>
            <div className="key-caps">
              {row.keys.map((cap) => (
                <kbd key={cap}>{cap}</kbd>
              ))}
            </div>
            <div className="key-legend-copy">
              <strong>{row.label}</strong>
              <span>{row.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {keyboardEnabled && !audioReady && !cameraActive ? (
        <button
          className="primary-action"
          onClick={() => {
            void onStartAudio()
          }}
          type="button"
        >
          Start without camera
        </button>
      ) : null}

      {keyboardEnabled && cameraActive ? (
        <p className="studio-note">Camera is on — keyboard input is paused.</p>
      ) : null}
    </section>
  )
}
