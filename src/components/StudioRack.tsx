import { CalibrationPanel } from './CalibrationPanel'
import { KeyboardPanel } from './KeyboardPanel'
import { LooperPanel } from './LooperPanel'

type StudioRackProps = {
  onStartAudio: () => Promise<void>
  onLooperArm: () => void
  onLooperClear: () => void
}

/**
 * Stacked "studio" controls that sit below the display toggles. Each feature is
 * its own compact card.
 */
export function StudioRack({
  onLooperArm,
  onLooperClear,
  onStartAudio,
}: StudioRackProps) {
  return (
    <section className="studio-rack" aria-label="Studio">
      <div className="studio-intro">
        <span className="panel-kicker">Studio</span>
        <p>Keyboard play · loop recorder · gesture calibration</p>
      </div>
      <KeyboardPanel onStartAudio={onStartAudio} />
      <LooperPanel onArm={onLooperArm} onClear={onLooperClear} />
      <CalibrationPanel />
    </section>
  )
}
