import { create } from 'zustand'
import {
  emptySignal,
  type HandSignal,
  type LooperState,
  type TrackerStatus,
} from '../domain/raveControls'
import { DEFAULT_PRESET_ID } from '../domain/musicPresets'
import { DEFAULT_VISUAL_PRESET_ID } from '../domain/visualPresets'
import {
  loadCalibration,
  saveCalibration,
  type Calibration,
} from '../domain/calibration'

type RaveStore = {
  audioReady: boolean
  calibration: Calibration
  keyboardEnabled: boolean
  looperBars: number
  looperState: LooperState
  message: string
  selectedPresetId: string
  selectedVisualPresetId: string
  signal: HandSignal
  signalSignature: string
  status: TrackerStatus
  commitSignal: (signal: HandSignal) => void
  resetSession: () => void
  setAudioReady: (ready: boolean) => void
  setCalibration: (calibration: Calibration) => void
  setKeyboardEnabled: (enabled: boolean) => void
  setLooperBars: (bars: number) => void
  setLooperState: (state: LooperState) => void
  setMessage: (message: string) => void
  setSelectedPresetId: (presetId: string) => void
  setSelectedVisualPresetId: (presetId: string) => void
  setSignal: (signal: HandSignal) => void
  setStatus: (status: TrackerStatus) => void
}

export const useRaveStore = create<RaveStore>((set) => ({
  audioReady: false,
  calibration: loadCalibration(),
  keyboardEnabled: false,
  looperBars: 2,
  looperState: 'idle',
  message: 'Listo',
  selectedPresetId: DEFAULT_PRESET_ID,
  selectedVisualPresetId: DEFAULT_VISUAL_PRESET_ID,
  signal: emptySignal,
  signalSignature: getSignalSignature(emptySignal),
  status: 'idle',
  commitSignal: (signal) =>
    set((state) => {
      const signalSignature = getSignalSignature(signal)

      if (signalSignature === state.signalSignature) {
        return state
      }

      return {
        message: signal.activeKeys.length > 0 ? 'Drop activo' : 'Escucha',
        signal,
        signalSignature,
      }
    }),
  resetSession: () =>
    set({
      audioReady: false,
      keyboardEnabled: false,
      looperBars: 2,
      looperState: 'idle',
      message: 'Listo',
      selectedPresetId: DEFAULT_PRESET_ID,
      selectedVisualPresetId: DEFAULT_VISUAL_PRESET_ID,
      signal: emptySignal,
      signalSignature: getSignalSignature(emptySignal),
      status: 'idle',
    }),
  setAudioReady: (audioReady) => set({ audioReady }),
  setCalibration: (calibration) => {
    saveCalibration(calibration)
    set({ calibration })
  },
  setKeyboardEnabled: (keyboardEnabled) => set({ keyboardEnabled }),
  setLooperBars: (looperBars) => set({ looperBars }),
  setLooperState: (looperState) => set({ looperState }),
  setMessage: (message) => set({ message }),
  setSelectedPresetId: (selectedPresetId) => set({ selectedPresetId }),
  setSelectedVisualPresetId: (selectedVisualPresetId) =>
    set({ selectedVisualPresetId }),
  setSignal: (signal) =>
    set({
      signal,
      signalSignature: getSignalSignature(signal),
    }),
  setStatus: (status) => set({ status }),
}))

if (import.meta.env.DEV) {
  ;(globalThis as { raveStore?: typeof useRaveStore }).raveStore = useRaveStore
}

function getSignalSignature(signal: HandSignal) {
  return [
    signal.activeKeys.join('-'),
    signal.hands
      .map((hand) =>
        [
          hand.side,
          q(hand.score, 20),
          q(hand.motion.height, 12),
          q(hand.motion.openness, 10),
          q(hand.motion.roll, 8),
          q(hand.motion.tilt, 8),
          q(hand.motion.x, 10),
        ].join(':'),
      )
      .join('|'),
  ].join('::')
}

function q(value: number, steps: number) {
  return Math.round(value * steps)
}
