import { useEffect, useRef } from 'react'
import {
  emptySignal,
  type ControlKey,
  type DetectedHand,
  type FingerId,
  type HandSide,
  type HandSignal,
} from '../domain/raveControls'
import { useRaveStore } from '../store/useRaveStore'

type KeyBinding = { side: HandSide; finger: FingerId }

/**
 * Keyboard bindings mirror the finger map: the left hand row plays rhythm,
 * the right hand row plays the color finger plus the four preset chords.
 */
const KEY_BINDINGS: Record<string, KeyBinding> = {
  a: { side: 'Left', finger: 'thumb' },
  s: { side: 'Left', finger: 'index' },
  d: { side: 'Left', finger: 'middle' },
  f: { side: 'Left', finger: 'ring' },
  g: { side: 'Left', finger: 'pinky' },
  h: { side: 'Right', finger: 'thumb' },
  j: { side: 'Right', finger: 'index' },
  k: { side: 'Right', finger: 'middle' },
  l: { side: 'Right', finger: 'ring' },
  ';': { side: 'Right', finger: 'pinky' },
}

/** Rows shown in the on-screen legend. */
export const KEYBOARD_LAYOUT = [
  {
    keys: ['A', 'S', 'D', 'F', 'G'],
    label: 'Left hand',
    hint: 'kick · hat · snare · clap · perc',
  },
  {
    keys: ['J', 'K', 'L', ';'],
    label: 'Right hand chords',
    hint: 'the four chords of the preset',
  },
  {
    keys: ['H'],
    label: 'Chord colour',
    hint: 'hold with a chord to open the voicing',
  },
  { keys: ['↑', '↓'], label: 'Right height', hint: 'voicing + filter' },
  { keys: ['←', '→'], label: 'Left openness', hint: 'beat density' },
]

const MODULATION_STEP = 0.08
const ARROW_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

/**
 * Lets the instrument be played from the keyboard when no webcam is available.
 * Held keys are turned into a synthetic {@link HandSignal} and pushed straight
 * into the store, so the audio engine and visuals react exactly as they do to
 * real hand tracking. The caller is responsible for only enabling this while the
 * camera is off (camera input wins).
 */
export function useKeyboardControls(enabled: boolean) {
  const heldRef = useRef<Set<string>>(new Set())
  const rightHeightRef = useRef(0.5)
  const leftOpenRef = useRef(0.4)

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Ref objects are stable for the component's lifetime, so capturing them
    // here keeps the same instances available to the cleanup function.
    const held = heldRef.current
    const rightHeight = rightHeightRef
    const leftOpen = leftOpenRef

    const publish = () => {
      useRaveStore
        .getState()
        .setSignal(buildSignal(held, rightHeight.current, leftOpen.current))
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      if (ARROW_KEYS.has(event.key)) {
        event.preventDefault()

        if (event.key === 'ArrowUp') {
          rightHeight.current = clamp01(rightHeight.current + MODULATION_STEP)
        } else if (event.key === 'ArrowDown') {
          rightHeight.current = clamp01(rightHeight.current - MODULATION_STEP)
        } else if (event.key === 'ArrowRight') {
          leftOpen.current = clamp01(leftOpen.current + MODULATION_STEP)
        } else {
          leftOpen.current = clamp01(leftOpen.current - MODULATION_STEP)
        }

        publish()
        return
      }

      const key = event.key.toLowerCase()

      if (!(key in KEY_BINDINGS) || held.has(key)) {
        return
      }

      held.add(key)
      publish()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (!held.delete(key)) {
        return
      }

      publish()
    }

    const handleBlur = () => {
      if (held.size === 0) {
        return
      }

      held.clear()
      publish()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    publish()

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      held.clear()
      rightHeight.current = 0.5
      leftOpen.current = 0.4
      useRaveStore.getState().setSignal(emptySignal)
    }
  }, [enabled])
}

function buildSignal(
  held: Set<string>,
  rightHeight: number,
  leftOpen: number,
): HandSignal {
  const fingersByHand: Record<HandSide, FingerId[]> = { Left: [], Right: [] }

  held.forEach((key) => {
    const binding = KEY_BINDINGS[key]

    if (binding) {
      fingersByHand[binding.side].push(binding.finger)
    }
  })

  const hands: DetectedHand[] = (['Left', 'Right'] as const)
    .filter((side) => fingersByHand[side].length > 0)
    .map((side) => buildHand(side, fingersByHand[side], rightHeight, leftOpen))

  if (hands.length === 0) {
    return emptySignal
  }

  const activeKeys = hands.flatMap((hand) => hand.activeKeys)

  return {
    activeKeys,
    hands,
    score: clamp01(activeKeys.length / 6),
  }
}

function buildHand(
  side: HandSide,
  fingers: FingerId[],
  rightHeight: number,
  leftOpen: number,
): DetectedHand {
  // The right thumb ("H") is the expression / colour finger, not a note. Holding
  // it widens the synthetic right hand, which the harmony engine reads as an
  // open voicing (octave extensions) and a louder pad / arp layer.
  const rightThumbHeld = side === 'Right' && fingers.includes('thumb')
  const openness = rightThumbHeld
    ? Math.max(fingers.length / 5, 0.6)
    : fingers.length / 5

  // Synthetic input is not affected by calibration, so raw and calibrated match.
  const motion = {
    height: side === 'Right' ? rightHeight : 0.5,
    openness,
    roll: 0,
    spread: side === 'Left' ? leftOpen : rightThumbHeld ? 0.85 : 0.4,
    tilt: 0,
    x: 0.5,
  }

  return {
    activeFingerIds: fingers,
    activeKeys: fingers.map((finger) => `${side}-${finger}` as ControlKey),
    center: [0.5, 0.5],
    label: side === 'Left' ? 'Izquierda' : 'Derecha',
    motion,
    rawMotion: motion,
    score: 1,
    side,
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
