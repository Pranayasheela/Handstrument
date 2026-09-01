export type FingerId = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'
export type HandSide = 'Left' | 'Right'
export type ControlKey = `${HandSide}-${FingerId}`
export type TrackerStatus = 'idle' | 'loading' | 'tracking' | 'error'

/** Rhythm looper lifecycle: idle → armed (waiting for the bar) → recording → playing. */
export type LooperState = 'idle' | 'armed' | 'recording' | 'playing'

export type FingerControl = {
  key: ControlKey
  side: HandSide
  id: FingerId
  finger: string
  label: string
  note?: string
  role: 'beat' | 'chord' | 'expression' | 'texture'
  color: string
  position: [number, number, number]
}

export type ChordColor = 'triad' | 'add9' | 'seventh' | 'octave'
export type HeightBand = 'low' | 'mid' | 'high'

export type RaveChord = {
  altitudeName: string
  bassNote: string
  color: string
  colorName: string
  complexity: number
  heightBand: HeightBand
  inversionName: string
  leftKey: ControlKey
  name: string
  notes: string[]
  rightKey: ControlKey
}

export type HandMotion = {
  height: number
  openness: number
  roll: number
  spread: number
  tilt: number
  x: number
}

export type DetectedHand = {
  side: HandSide
  label: string
  activeFingerIds: FingerId[]
  activeKeys: ControlKey[]
  score: number
  center: [number, number]
  /** Motion after user calibration is applied — this drives audio and visuals. */
  motion: HandMotion
  /** Motion straight from the tracker, before calibration (used by the calibration UI). */
  rawMotion: HandMotion
}

export type HandSignal = {
  hands: DetectedHand[]
  activeKeys: ControlKey[]
  score: number
}

export const FINGER_LABELS: Record<FingerId, string> = {
  thumb: 'Pulgar',
  index: 'Indice',
  middle: 'Medio',
  ring: 'Anular',
  pinky: 'Menique',
}

export const LEFT_CONTROLS: FingerControl[] = [
  {
    key: 'Left-thumb',
    side: 'Left',
    id: 'thumb',
    finger: FINGER_LABELS.thumb,
    label: 'Kick',
    role: 'beat',
    color: '#ff4d6d',
    position: [-3.4, -1.05, 0],
  },
  {
    key: 'Left-index',
    side: 'Left',
    id: 'index',
    finger: FINGER_LABELS.index,
    label: 'Hat',
    role: 'beat',
    color: '#ffb703',
    position: [-2.45, 0.15, -0.25],
  },
  {
    key: 'Left-middle',
    side: 'Left',
    id: 'middle',
    finger: FINGER_LABELS.middle,
    label: 'Snare',
    role: 'beat',
    color: '#8ac926',
    position: [-1.45, 0.62, 0.15],
  },
  {
    key: 'Left-ring',
    side: 'Left',
    id: 'ring',
    finger: FINGER_LABELS.ring,
    label: 'Clap',
    role: 'beat',
    color: '#3a86ff',
    position: [-0.6, 0.12, -0.2],
  },
  {
    key: 'Left-pinky',
    side: 'Left',
    id: 'pinky',
    finger: FINGER_LABELS.pinky,
    label: 'Perc',
    role: 'texture',
    color: '#b517ff',
    position: [-0.15, -0.95, 0],
  },
]

export const RIGHT_CONTROLS: FingerControl[] = [
  {
    key: 'Right-thumb',
    side: 'Right',
    id: 'thumb',
    finger: FINGER_LABELS.thumb,
    label: 'Color',
    role: 'expression',
    color: '#2ec4b6',
    position: [0.15, -0.95, 0],
  },
  {
    key: 'Right-index',
    side: 'Right',
    id: 'index',
    finger: FINGER_LABELS.index,
    label: 'Bm',
    note: 'B2',
    role: 'chord',
    color: '#70d6ff',
    position: [0.6, 0.12, -0.2],
  },
  {
    key: 'Right-middle',
    side: 'Right',
    id: 'middle',
    finger: FINGER_LABELS.middle,
    label: 'G',
    note: 'G2',
    role: 'chord',
    color: '#ff70a6',
    position: [1.45, 0.62, 0.15],
  },
  {
    key: 'Right-ring',
    side: 'Right',
    id: 'ring',
    finger: FINGER_LABELS.ring,
    label: 'D',
    note: 'D2',
    role: 'chord',
    color: '#ffd670',
    position: [2.45, 0.15, -0.25],
  },
  {
    key: 'Right-pinky',
    side: 'Right',
    id: 'pinky',
    finger: FINGER_LABELS.pinky,
    label: 'A',
    note: 'A2',
    role: 'chord',
    color: '#e9ff70',
    position: [3.4, -1.05, 0],
  },
]

export const FINGER_CONTROLS = [...LEFT_CONTROLS, ...RIGHT_CONTROLS]

export const CONTROL_BY_KEY = new Map(
  FINGER_CONTROLS.map((control) => [control.key, control]),
)

export const BASE_CHORDS: Record<
  ControlKey,
  { bassNote: string; name: string; notes: string[] }
> = {
  'Left-index': {
    bassNote: 'B1',
    name: 'Bm',
    notes: ['B3', 'D4', 'F#4'],
  },
  'Left-middle': {
    bassNote: 'G1',
    name: 'G',
    notes: ['G3', 'B3', 'D4'],
  },
  'Left-ring': {
    bassNote: 'D2',
    name: 'D',
    notes: ['D4', 'F#4', 'A4'],
  },
  'Left-pinky': {
    bassNote: 'A1',
    name: 'A',
    notes: ['A3', 'C#4', 'E4'],
  },
  'Left-thumb': {
    bassNote: 'B1',
    name: 'Bm',
    notes: ['B3', 'D4', 'F#4'],
  },
  'Right-thumb': {
    bassNote: 'B1',
    name: 'Bm',
    notes: ['B3', 'D4', 'F#4'],
  },
  'Right-index': {
    bassNote: 'B1',
    name: 'Bm',
    notes: ['B3', 'D4', 'F#4'],
  },
  'Right-middle': {
    bassNote: 'G1',
    name: 'G',
    notes: ['G3', 'B3', 'D4'],
  },
  'Right-ring': {
    bassNote: 'D2',
    name: 'D',
    notes: ['D4', 'F#4', 'A4'],
  },
  'Right-pinky': {
    bassNote: 'A1',
    name: 'A',
    notes: ['A3', 'C#4', 'E4'],
  },
}

export const CHORD_COLORS: Record<
  ControlKey,
  { color: ChordColor; colorName: string }
> = {
  'Right-index': { color: 'triad', colorName: 'Triada' },
  'Right-middle': { color: 'add9', colorName: 'Add9' },
  'Right-ring': { color: 'seventh', colorName: '7th' },
  'Right-pinky': { color: 'octave', colorName: 'Octava' },
  'Left-thumb': { color: 'triad', colorName: 'Triada' },
  'Left-index': { color: 'triad', colorName: 'Triada' },
  'Left-middle': { color: 'triad', colorName: 'Triada' },
  'Left-ring': { color: 'triad', colorName: 'Triada' },
  'Left-pinky': { color: 'triad', colorName: 'Triada' },
  'Right-thumb': { color: 'triad', colorName: 'Triada' },
}

export const HARMONY_KEYS: ControlKey[] = [
  'Right-index',
  'Right-middle',
  'Right-ring',
  'Right-pinky',
]

export const CHORD_COLOR_KEYS: ControlKey[] = [
  'Right-thumb',
  'Right-index',
  'Right-middle',
  'Right-ring',
  'Right-pinky',
]

export const BEAT_KEYS: ControlKey[] = [
  'Left-thumb',
  'Left-index',
  'Left-middle',
  'Left-ring',
  'Left-pinky',
]

export const emptySignal: HandSignal = {
  activeKeys: [],
  hands: [],
  score: 0,
}
