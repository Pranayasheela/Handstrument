import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  Camera,
  Code2,
  Eye,
  Hand,
  Mic2,
  Radio,
  ShieldCheck,
  Sparkles,
  Volume2,
  Waves,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ControlBank } from './components/ControlBank'
import { GenreSelector } from './components/GenreSelector'
import { HandTracker } from './components/HandTracker'
import { MusicInfoPanel } from './components/MusicInfoPanel'
import { RaveNodeScene } from './components/RaveNodeScene'
import { StatusPill } from './components/StatusPill'
import { VisualSelector } from './components/VisualSelector'
import { getMusicPreset } from './domain/musicPresets'
import { getVisualPreset } from './domain/visualPresets'
import {
  CONTROL_BY_KEY,
  LEFT_CONTROLS,
  RIGHT_CONTROLS,
  type FingerControl,
} from './domain/raveControls'
import { useRaveEngine } from './hooks/useRaveEngine'
import { useRaveStore } from './store/useRaveStore'
import { getChordLabel } from './utils/harmony'
import './App.css'

function App() {
  const [showLandmarks, setShowLandmarks] = useState(true)
  const [showVisualizer, setShowVisualizer] = useState(true)
  const signal = useRaveStore((state) => state.signal)
  const status = useRaveStore((state) => state.status)
  const message = useRaveStore((state) => state.message)
  const audioReady = useRaveStore((state) => state.audioReady)
  const selectedPresetId = useRaveStore((state) => state.selectedPresetId)
  const selectedVisualPresetId = useRaveStore(
    (state) => state.selectedVisualPresetId,
  )
  const setAudioReady = useRaveStore((state) => state.setAudioReady)
  const setMessage = useRaveStore((state) => state.setMessage)
  const selectedPreset = getMusicPreset(selectedPresetId)
  const selectedVisualPreset = getVisualPreset(selectedVisualPresetId)

  const activeControls = useMemo(
    () =>
      signal.activeKeys
        .map((key) => CONTROL_BY_KEY.get(key))
        .filter((control): control is FingerControl => Boolean(control)),
    [signal.activeKeys],
  )
  const rightControls = useMemo(() => {
    const chordControls = RIGHT_CONTROLS.filter((control) => control.role === 'chord')

    return RIGHT_CONTROLS.map((control) => {
      if (control.role !== 'chord') {
        return control
      }

      const chordIndex = chordControls.findIndex(
        (chordControl) => chordControl.key === control.key,
      )
      const label =
        selectedPreset.progression[chordIndex % selectedPreset.progression.length]

      return { ...control, label }
    })
  }, [selectedPreset])
  const { startAudio, stopAudio } = useRaveEngine(selectedPreset, setAudioReady)
  const detectedLabel =
    signal.hands.length > 0
      ? signal.hands.map((hand) => hand.label).join(' + ')
      : 'Sin manos'
  const chordLabel = getChordLabel(signal.activeKeys, signal.hands, selectedPreset)
  const hasHands = signal.hands.length > 0
  const activeGesture =
    chordLabel !== 'Sin acorde'
      ? chordLabel
      : activeControls.length > 0
        ? activeControls.map((item) => item.label).join(' + ')
        : 'Waiting for gesture'
  const cameraStatus =
    status === 'tracking'
      ? 'Camera live'
      : status === 'loading'
        ? 'Requesting access'
        : status === 'error'
          ? 'Permission blocked'
          : 'Ready'

  const handleStart = useCallback(async () => {
    setMessage('Activando')
    await startAudio()
    setAudioReady(true)
  }, [setAudioReady, setMessage, startAudio])

  return (
    <main className="app-shell">
      <section className="stage">
        {showVisualizer ? (
          <div className="scene-layer" aria-hidden="true">
            <Canvas camera={{ position: [0, 0.55, 7.2], fov: 47 }}>
              <color attach="background" args={[selectedVisualPreset.background]} />
              <fog attach="fog" args={[selectedVisualPreset.background, 7, 15]} />
              <ambientLight intensity={0.55} />
              <pointLight
                color={selectedVisualPreset.secondary}
                intensity={2.4}
                position={[-4, 2, 4]}
              />
              <pointLight
                color={selectedVisualPreset.primary}
                intensity={2.2}
                position={[4, 2, 4]}
              />
              <pointLight
                color={selectedVisualPreset.accent}
                intensity={1.4}
                position={[0, -3, 3]}
              />
              <RaveNodeScene
                activeKeys={signal.activeKeys}
                hands={signal.hands}
                preset={selectedPreset}
                visualPreset={selectedVisualPreset}
              />
              <OrbitControls
                autoRotate
                autoRotateSpeed={0.55}
                enablePan={false}
                enableZoom={false}
                maxPolarAngle={Math.PI / 1.62}
                minPolarAngle={Math.PI / 2.8}
              />
            </Canvas>
          </div>
        ) : null}

        <div className="instrument-panel">
          <header className="topbar">
            <div className="hero-copy">
              <p className="eyebrow">Two hand rave controller</p>
              <h1>Control Music With Your Hands</h1>
              <p>
                Use your webcam to turn hand gestures into sound, rhythm, and
                interactive visuals.
              </p>
              <div className="hero-actions">
                <a className="primary-link" href="#demo">
                  Start Experience
                </a>
                <a
                  className="secondary-link"
                  href="https://github.com/JayusAsterion/hand-music-controller"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Code2 size={16} />
                  View GitHub
                </a>
              </div>
            </div>
            <div className="status-cluster">
              <StatusPill
                icon={<Camera size={16} />}
                label={status === 'tracking' ? '2 manos' : 'Camara'}
                tone={status === 'tracking' ? 'good' : 'muted'}
              />
              <StatusPill
                icon={<Volume2 size={16} />}
                label={audioReady ? 'Rave' : 'Audio'}
                tone={audioReady ? 'hot' : 'muted'}
              />
            </div>
          </header>

          <section className="how-it-works" aria-label="How it works">
            <div>
              <span className="panel-kicker">How it works</span>
              <ol>
                <li>Allow camera access.</li>
                <li>Raise your hand.</li>
                <li>Move your hand to control sound.</li>
              </ol>
            </div>
            <p>
              <ShieldCheck size={15} />
              Camera runs locally in your browser. No video is uploaded.
            </p>
          </section>

          <div className="selector-grid">
            <GenreSelector />
            <VisualSelector />
          </div>

          <div className="control-grid" id="demo">
            <HandTracker
              onStartAudio={handleStart}
              onStopAudio={stopAudio}
              showLandmarks={showLandmarks}
            />

            <section className="notes-panel" aria-label="Controles rave">
              <div className="meter-heading">
                <div>
                  <span className="panel-kicker">Mapa</span>
                  <h2>Ritmo + Lead</h2>
                </div>
                <div className="hand-readout">
                  <Hand size={18} />
                  <span>{detectedLabel}</span>
                </div>
              </div>

              <ControlBank title="Izquierda" controls={LEFT_CONTROLS} signal={signal} />
              <ControlBank title="Derecha" controls={rightControls} signal={signal} />

              <div className="signal-strip">
                <div>
                  <span className="panel-kicker">Energia</span>
                  <strong>{Math.round(signal.score * 100)}%</strong>
                </div>
                <div className="signal-bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(signal.score * 100)}%` }} />
                </div>
              </div>

              <div className="active-chord">
                <Radio size={18} />
                <span>
                  {chordLabel !== 'Sin acorde'
                    ? chordLabel
                    : activeControls.length > 0
                      ? activeControls.map((item) => item.label).join(' + ')
                      : 'Silencio'}
                </span>
              </div>

              <p className="system-message">{message}</p>
            </section>
          </div>

          <section className="status-card" aria-label="Demo status">
            <div className="status-row">
              <Camera size={16} />
              <span>Camera</span>
              <strong>{cameraStatus}</strong>
            </div>
            <div className="status-row">
              <Hand size={16} />
              <span>Hands</span>
              <strong>{hasHands ? detectedLabel : 'No hand detected'}</strong>
            </div>
            <div className="status-row">
              <Waves size={16} />
              <span>Gesture</span>
              <strong>{activeGesture}</strong>
            </div>
            <div className="status-row">
              <Sparkles size={16} />
              <span>Mode</span>
              <strong>{selectedPreset.name}</strong>
            </div>
            <div className="status-row">
              <Volume2 size={16} />
              <span>Audio</span>
              <strong>{audioReady ? 'Started' : 'Not started'}</strong>
            </div>
          </section>

          <section className="control-toggles" aria-label="Display controls">
            <label>
              <input
                checked={showLandmarks}
                onChange={(event) => setShowLandmarks(event.target.checked)}
                type="checkbox"
              />
              <Eye size={16} />
              Show hand landmarks
            </label>
            <label>
              <input
                checked={showVisualizer}
                onChange={(event) => setShowVisualizer(event.target.checked)}
                type="checkbox"
              />
              <Sparkles size={16} />
              Show visualizer
            </label>
            <label className="disabled-control">
              <input disabled type="checkbox" />
              <Mic2 size={16} />
              AI voice guide
            </label>
          </section>

          <section className="gesture-guide" aria-label="Gesture guide">
            <div>
              <span className="panel-kicker">Left hand</span>
              <p>Thumb kick, index hats, middle snare, ring clap, pinky texture.</p>
            </div>
            <div>
              <span className="panel-kicker">Right hand</span>
              <p>Choose chords, open voicings, tilt effects, and roll inversions.</p>
            </div>
          </section>
        </div>

        <MusicInfoPanel
          activeControls={activeControls}
          selectedPresetId={selectedPresetId}
          selectedVisualPresetId={selectedVisualPresetId}
          signal={signal}
        />
      </section>
    </main>
  )
}

export default App
