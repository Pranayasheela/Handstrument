import { FilesetResolver, type HandLandmarker } from '@mediapipe/tasks-vision'
import { Activity, Play, Power } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { emptySignal } from '../domain/raveControls'
import { useRaveStore } from '../store/useRaveStore'
import {
  clearCanvas,
  createHandLandmarker,
  drawHandOverlay,
  readHandSignal,
  WASM_URL,
} from '../utils/handTracking'

type HandTrackerProps = {
  onStartAudio: () => Promise<void>
  onStopAudio: () => void
  showLandmarks: boolean
}

const ACTIVE_DETECTION_INTERVAL_MS = 33
const IDLE_DETECTION_INTERVAL_MS = 42

export function HandTracker({
  onStartAudio,
  onStopAudio,
  showLandmarks,
}: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastDetectionRef = useRef(0)
  const detectedHandCountRef = useRef(0)

  const audioReady = useRaveStore((state) => state.audioReady)
  const status = useRaveStore((state) => state.status)
  const commitSignal = useRaveStore((state) => state.commitSignal)
  const setMessage = useRaveStore((state) => state.setMessage)
  const setSignal = useRaveStore((state) => state.setSignal)
  const setStatus = useRaveStore((state) => state.setStatus)

  const stopTracking = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    handLandmarkerRef.current?.close()
    handLandmarkerRef.current = null
    detectedHandCountRef.current = 0
    lastDetectionRef.current = 0
    clearCanvas(canvasRef.current)
    onStopAudio()
    setSignal(emptySignal)
    setStatus('idle')
    setMessage('Listo')
  }, [onStopAudio, setMessage, setSignal, setStatus])

  const runDetectionLoop = useCallback(() => {
    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const handLandmarker = handLandmarkerRef.current
      const now = performance.now()
      const detectionInterval =
        detectedHandCountRef.current > 0
          ? ACTIVE_DETECTION_INTERVAL_MS
          : IDLE_DETECTION_INTERVAL_MS

      if (
        video &&
        canvas &&
        handLandmarker &&
        video.readyState >= 2 &&
        now - lastDetectionRef.current >= detectionInterval
      ) {
        lastDetectionRef.current = now
        const result = handLandmarker.detectForVideo(video, now)
        const nextSignal = readHandSignal(result)

        detectedHandCountRef.current = nextSignal.hands.length
        if (showLandmarks) {
          drawHandOverlay(canvas, video, result)
        } else {
          clearCanvas(canvas)
        }

        commitSignal(nextSignal)
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    tick()
  }, [commitSignal, showLandmarks])

  const startTracking = useCallback(async () => {
    if (status === 'loading' || status === 'tracking') {
      return
    }

    try {
      setStatus('loading')
      setMessage('Cargando modelo')
      await onStartAudio()

      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      const handLandmarker = await createHandLandmarker(vision)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      const video = videoRef.current

      if (!video) {
        throw new Error('No se pudo montar el video')
      }

      handLandmarkerRef.current = handLandmarker
      streamRef.current = stream
      video.srcObject = stream
      await video.play()

      setStatus('tracking')
      setMessage('Escucha')
      runDetectionLoop()
    } catch (error) {
      console.error(error)
      stopTracking()
      setStatus('error')
      setMessage('Sin acceso')
    }
  }, [
    onStartAudio,
    runDetectionLoop,
    setMessage,
    setStatus,
    status,
    stopTracking,
  ])

  useEffect(() => stopTracking, [stopTracking])

  const isRunning = status === 'tracking' || status === 'loading'

  return (
    <section className="camera-panel" aria-label="Control de camara">
      <div className="camera-frame">
        <video ref={videoRef} muted playsInline />
        <canvas
          aria-hidden="true"
          className={showLandmarks ? undefined : 'landmarks-hidden'}
          ref={canvasRef}
        />
        <div className="scan-line" aria-hidden="true" />
      </div>

      <div className="transport">
        <button
          className="primary-action"
          disabled={status === 'loading'}
          onClick={isRunning ? stopTracking : startTracking}
          type="button"
        >
          {isRunning ? <Power size={19} /> : <Play size={19} />}
          {isRunning ? 'Detener' : 'Iniciar rave'}
        </button>
        <div className="transport-state">
          <Activity size={18} />
          <span>{status === 'loading' ? 'Cargando' : audioReady ? '140 BPM' : 'Pausa'}</span>
        </div>
      </div>
    </section>
  )
}
