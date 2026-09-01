import {
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import {
  emptySignal,
  type ControlKey,
  type DetectedHand,
  type FingerId,
  type HandSide,
  type HandSignal,
} from '../domain/raveControls'
import {
  applyCalibration,
  DEFAULT_CALIBRATION,
  type Calibration,
} from '../domain/calibration'

export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
export const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'

type VisionFileset = Parameters<typeof HandLandmarker.createFromOptions>[0]

export async function createHandLandmarker(vision: VisionFileset) {
  const options = {
    minHandDetectionConfidence: 0.58,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
    numHands: 2,
    runningMode: 'VIDEO' as const,
  }

  try {
    return await HandLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: {
        delegate: 'GPU',
        modelAssetPath: MODEL_URL,
      },
    })
  } catch {
    return HandLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: {
        delegate: 'CPU',
        modelAssetPath: MODEL_URL,
      },
    })
  }
}

export function readHandSignal(
  result: HandLandmarkerResult,
  calibration: Calibration = DEFAULT_CALIBRATION,
): HandSignal {
  const hands: DetectedHand[] = result.landmarks
    .map((landmarks, index) => {
      const handedness = result.handedness[index]?.[0]
      const side: HandSide = handedness?.categoryName === 'Left' ? 'Left' : 'Right'
      const activeFingerIds = getRaisedFingers(
        landmarks,
        side,
        calibration.fingerSensitivity,
      )
      const activeKeys = activeFingerIds.map((id) => `${side}-${id}` as ControlKey)
      const rawMotion = getHandMotion(landmarks, activeFingerIds)

      return {
        activeFingerIds,
        activeKeys,
        center: getHandCenter(landmarks),
        label: side === 'Left' ? 'Izquierda' : 'Derecha',
        motion: applyCalibration(rawMotion, calibration),
        rawMotion,
        score: handedness?.score ?? 0,
        side,
      }
    })
    .sort((first, second) => first.side.localeCompare(second.side))

  if (hands.length === 0) {
    return emptySignal
  }

  const activeKeys = hands.flatMap((hand) => hand.activeKeys)
  const score =
    hands.reduce((total, hand) => total + hand.score, 0) / Math.max(hands.length, 1)

  return { activeKeys, hands, score }
}

export function drawHandOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  result: HandLandmarkerResult,
) {
  const context = canvas.getContext('2d')
  const width = video.videoWidth || 640
  const height = video.videoHeight || 480

  if (!context) {
    return
  }

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  context.clearRect(0, 0, width, height)
  result.landmarks.forEach((landmarks, handIndex) => {
    const side =
      result.handedness[handIndex]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right'
    const color = side === 'Left' ? '#ff4d6d' : '#70d6ff'

    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = Math.max(3, width * 0.006)
    context.strokeStyle = color

    HandLandmarker.HAND_CONNECTIONS.forEach(({ start, end }) => {
      const from = landmarks[start]
      const to = landmarks[end]
      context.beginPath()
      context.moveTo(from.x * width, from.y * height)
      context.lineTo(to.x * width, to.y * height)
      context.stroke()
    })

    landmarks.forEach((landmark, index) => {
      const isTip = [4, 8, 12, 16, 20].includes(index)
      context.beginPath()
      context.fillStyle = isTip ? '#ffffff' : 'rgba(255, 255, 255, 0.72)'
      context.arc(
        landmark.x * width,
        landmark.y * height,
        isTip ? width * 0.011 : width * 0.007,
        0,
        Math.PI * 2,
      )
      context.fill()
    })
  })
}

export function clearCanvas(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext('2d')

  if (canvas && context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function getHandCenter(landmarks: NormalizedLandmark[]): [number, number] {
  const total = landmarks.reduce(
    (sum, landmark) => ({
      x: sum.x + landmark.x,
      y: sum.y + landmark.y,
    }),
    { x: 0, y: 0 },
  )

  return [total.x / landmarks.length, total.y / landmarks.length]
}

function getHandMotion(
  landmarks: NormalizedLandmark[],
  activeFingerIds: FingerId[],
) {
  const center = getHandCenter(landmarks)
  const wrist = landmarks[0]
  const indexBase = landmarks[5]
  const pinkyBase = landmarks[17]
  const middleTip = landmarks[12]
  const roll = Math.atan2(indexBase.y - pinkyBase.y, indexBase.x - pinkyBase.x)
  const tilt = Math.atan2(middleTip.y - wrist.y, middleTip.x - wrist.x)
  const spread = Math.hypot(indexBase.x - pinkyBase.x, indexBase.y - pinkyBase.y)

  return {
    height: clamp01(1 - center[1]),
    openness: activeFingerIds.length / 5,
    roll,
    spread: clamp01(spread * 5),
    tilt,
    x: clamp01(center[0]),
  }
}

function getRaisedFingers(
  landmarks: NormalizedLandmark[],
  handedness: HandSide = 'Right',
  sensitivity = 1,
): FingerId[] {
  const raised: FingerId[] = []
  const thumbTip = landmarks[4]
  const thumbIp = landmarks[3]
  const thumbMargin = 0.03 * sensitivity
  const fingerMargin = 0.035 * sensitivity
  const thumbOpen =
    handedness === 'Left'
      ? thumbTip.x > thumbIp.x + thumbMargin
      : thumbTip.x < thumbIp.x - thumbMargin

  if (thumbOpen) {
    raised.push('thumb')
  }

  const fingers: Array<[FingerId, number, number]> = [
    ['index', 8, 6],
    ['middle', 12, 10],
    ['ring', 16, 14],
    ['pinky', 20, 18],
  ]

  fingers.forEach(([id, tip, pip]) => {
    if (landmarks[tip].y < landmarks[pip].y - fingerMargin) {
      raised.push(id)
    }
  })

  return raised
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
