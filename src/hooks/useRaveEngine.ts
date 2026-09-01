import { useCallback, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import {
  BEAT_KEYS,
  type ControlKey,
  type DetectedHand,
  type HandSignal,
  type LooperState,
} from '../domain/raveControls'
import type { MusicPreset, SampleSlot } from '../domain/musicPresets'
import { useRaveStore } from '../store/useRaveStore'
import { resolvePresetSamples } from '../utils/audioSamples'
import { getConnectedChord } from '../utils/harmony'
export function useRaveEngine(
  preset: MusicPreset,
  setAudioReady: (ready: boolean) => void,
) {
  const bassRef = useRef<Tone.MonoSynth | null>(null)
  const leadRef = useRef<Tone.PolySynth | null>(null)
  const padRef = useRef<Tone.PolySynth | null>(null)
  const arpRef = useRef<Tone.Synth | null>(null)
  const kickRef = useRef<Tone.MembraneSynth | null>(null)
  const clapRef = useRef<Tone.NoiseSynth | null>(null)
  const hatRef = useRef<Tone.NoiseSynth | null>(null)
  const acidRef = useRef<Tone.MonoSynth | null>(null)
  const masterRef = useRef<Tone.Limiter | null>(null)
  const filterRef = useRef<Tone.Filter | null>(null)
  const delayRef = useRef<Tone.FeedbackDelay | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)
  const driveRef = useRef<Tone.Distortion | null>(null)
  const samplePlayersRef = useRef<Partial<Record<SampleSlot, Tone.Player>>>({})
  const samplePresetRef = useRef('')
  const loopsRef = useRef<Tone.Loop[]>([])
  const activeKeysRef = useRef<Set<ControlKey>>(new Set())
  const handsRef = useRef<DetectedHand[]>([])
  const activeLeadNotesRef = useRef<Set<string>>(new Set())
  const activePadNotesRef = useRef<Set<string>>(new Set())
  const activeBassNoteRef = useRef<string | null>(null)
  const arpStepRef = useRef(0)
  const beatStepRef = useRef(0)
  const presetRef = useRef(preset)

  // Rhythm looper: a ring buffer of the left-hand beat keys held at each 16th step.
  const looperStateRef = useRef<LooperState>('idle')
  const looperPatternRef = useRef<Array<Set<ControlKey>>>([])
  const looperArmTickRef = useRef(0)
  const looperRecordedRef = useRef(0)

  const setLooperState = useCallback((next: LooperState) => {
    looperStateRef.current = next
    useRaveStore.getState().setLooperState(next)
  }, [])

  const isBeatActive = useCallback((key: ControlKey) => {
    if (activeKeysRef.current.has(key)) {
      return true
    }

    const pattern = looperPatternRef.current

    if (looperStateRef.current !== 'playing' || pattern.length === 0) {
      return false
    }

    return pattern[loopStep(pattern.length)]?.has(key) ?? false
  }, [])

  const applyGestureModulation = useCallback((nextPreset: MusicPreset) => {
    const leftMotion = getHandMotion(handsRef.current, 'Left')
    const rightMotion = getHandMotion(handsRef.current, 'Right')
    const leftRoll = normalizeAngle(leftMotion.roll)
    const rightRoll = normalizeAngle(rightMotion.roll)
    const rightTilt = normalizeAngle(rightMotion.tilt)
    const rightExpression = Math.max(rightMotion.openness, rightMotion.spread)

    Tone.Transport.bpm.rampTo(nextPreset.bpm, 0.12)
    kickRef.current?.volume.rampTo(-8 + leftMotion.height * 2, 0.08)
    hatRef.current?.volume.rampTo(-13 + leftMotion.openness * 8, 0.08)
    clapRef.current?.volume.rampTo(-11 + Math.max(leftRoll, leftMotion.x) * 3, 0.08)
    acidRef.current?.volume.rampTo(-10 + leftMotion.x * 4, 0.08)

    filterRef.current?.frequency.rampTo(650 + rightMotion.height * 4300, 0.12)
    padRef.current?.volume.rampTo(-25 + rightExpression * 12, 0.12)
    arpRef.current?.volume.rampTo(-25 + rightTilt * 13, 0.12)
    leadRef.current?.volume.rampTo(-18 + rightRoll * 8, 0.12)
    delayRef.current?.wet.rampTo(0.06 + rightTilt * 0.32, 0.12)
    reverbRef.current?.wet.rampTo(0.14 + rightMotion.height * 0.24, 0.12)

    if (driveRef.current) {
      driveRef.current.distortion = 0.12 + leftMotion.openness * 0.2
    }
  }, [])

  const updateFromSignal = useCallback((signal: HandSignal, nextPreset: MusicPreset) => {
    activeKeysRef.current = new Set(signal.activeKeys)
    handsRef.current = signal.hands
    const connectedChord = getConnectedChord(
      signal.activeKeys,
      signal.hands,
      nextPreset,
    )

    applyGestureModulation(nextPreset)

    const leadNotes = new Set<string>()

    leadNotes.forEach((note) => {
      if (!activeLeadNotesRef.current.has(note)) {
        leadRef.current?.triggerAttack(note)
      }
    })

    activeLeadNotesRef.current.forEach((note) => {
      if (!leadNotes.has(note)) {
        leadRef.current?.triggerRelease(note)
      }
    })

    activeLeadNotesRef.current = leadNotes

    const padNotes = new Set(connectedChord?.notes ?? [])

    padNotes.forEach((note) => {
      if (!activePadNotesRef.current.has(note)) {
        padRef.current?.triggerAttack(note)
      }
    })

    activePadNotesRef.current.forEach((note) => {
      if (!padNotes.has(note)) {
        padRef.current?.triggerRelease(note)
      }
    })

    activePadNotesRef.current = padNotes

    const bassNote = connectedChord?.bassNote ?? null

    if (bassNote !== activeBassNoteRef.current) {
      if (bassNote) {
        bassRef.current?.triggerAttack(bassNote)
      } else {
        bassRef.current?.triggerRelease()
      }

      activeBassNoteRef.current = bassNote
    }
  }, [applyGestureModulation])

  const startAudio = useCallback(async () => {
    const currentPreset = presetRef.current

    await Tone.start()
    Tone.Transport.bpm.value = currentPreset.bpm

    if (!bassRef.current) {
      const limiter = new Tone.Limiter(-1).toDestination()
      const reverb = new Tone.Reverb({ decay: 2.8, wet: 0.22 }).connect(limiter)
      const delay = new Tone.FeedbackDelay('8n.', 0.34).connect(reverb)
      const drive = new Tone.Distortion(0.22).connect(delay)
      const filter = new Tone.Filter(1500, 'lowpass').connect(drive)
      masterRef.current = limiter
      filterRef.current = filter
      delayRef.current = delay
      reverbRef.current = reverb
      driveRef.current = drive

      bassRef.current = new Tone.MonoSynth({
        envelope: { attack: 0.01, decay: 0.18, release: 0.14, sustain: 0.22 },
        filterEnvelope: {
          attack: 0.01,
          baseFrequency: 90,
          decay: 0.18,
          exponent: 2,
          octaves: 4.5,
          release: 0.2,
          sustain: 0.18,
        },
        oscillator: { type: 'sawtooth' },
        volume: -9,
      }).connect(filter)

      acidRef.current = new Tone.MonoSynth({
        envelope: { attack: 0.005, decay: 0.08, release: 0.08, sustain: 0.12 },
        filterEnvelope: {
          attack: 0.005,
          baseFrequency: 320,
          decay: 0.08,
          exponent: 3,
          octaves: 5,
          release: 0.1,
          sustain: 0.1,
        },
        oscillator: { type: 'square' },
        volume: -15,
      }).connect(delay)

      leadRef.current = new Tone.PolySynth(Tone.Synth, {
        envelope: { attack: 0.02, decay: 0.18, release: 0.38, sustain: 0.42 },
        oscillator: { type: 'fatsawtooth', count: 3, spread: 22 },
        volume: -12,
      }).connect(delay)

      padRef.current = new Tone.PolySynth(Tone.Synth, {
        envelope: { attack: 0.18, decay: 0.5, release: 1.1, sustain: 0.58 },
        oscillator: { type: 'fatsawtooth', count: 5, spread: 34 },
        volume: -18,
      }).connect(reverb)

      arpRef.current = new Tone.Synth({
        envelope: { attack: 0.006, decay: 0.08, release: 0.12, sustain: 0.08 },
        oscillator: { type: 'pulse', width: 0.42 },
        volume: -16,
      }).connect(delay)

      kickRef.current = new Tone.MembraneSynth({
        envelope: { attack: 0.001, decay: 0.38, release: 0.05, sustain: 0 },
        octaves: 9,
        pitchDecay: 0.035,
        volume: -7,
      }).connect(limiter)

      clapRef.current = new Tone.NoiseSynth({
        envelope: { attack: 0.001, decay: 0.16, release: 0.06, sustain: 0 },
        noise: { type: 'pink' },
        volume: -13,
      }).connect(reverb)

      hatRef.current = new Tone.NoiseSynth({
        envelope: { attack: 0.001, decay: 0.035, release: 0.015, sustain: 0 },
        noise: { type: 'white' },
        volume: -24,
      }).connect(limiter)

      loopsRef.current = [
        new Tone.Loop((time) => {
          const leftMotion = getHandMotion(handsRef.current, 'Left')

          if (isBeatActive('Left-thumb')) {
            const velocity = 0.7 + leftMotion.height * 0.3

            if (!triggerSample('kick', time)) {
              kickRef.current?.triggerAttackRelease(
                leftMotion.height > 0.7 ? 'D1' : 'C1',
                '16n',
                time,
                velocity,
              )
            }
          }
        }, '4n').start(0),
        new Tone.Loop((time) => {
          const leftMotion = getHandMotion(handsRef.current, 'Left')
          // Steady 8th-note hats by default; open the hand for full 16ths.
          const isDenseStep =
            leftMotion.openness > 0.55 || beatStepRef.current % 2 === 0

          if (isBeatActive('Left-index') && isDenseStep) {
            if (!triggerSample('hat', time)) {
              hatRef.current?.triggerAttackRelease('32n', time)
            }
          }
        }, '16n').start(0),
        new Tone.Loop((time) => {
          if (isBeatActive('Left-middle')) {
            if (!triggerSample('snare', time)) {
              clapRef.current?.triggerAttackRelease('16n', time)
            }
          }
        }, '2n').start('2n'),
        new Tone.Loop((time) => {
          if (isBeatActive('Left-ring')) {
            if (!triggerSample('clap', time)) {
              clapRef.current?.triggerAttackRelease('16n', time)
            }
          }
        }, '2n').start('4n'),
        new Tone.Loop((time) => {
          const leftMotion = getHandMotion(handsRef.current, 'Left')

          if (isBeatActive('Left-pinky')) {
            if (!triggerSample('perc', time)) {
              const note = leftMotion.x > 0.55 ? 'F#2' : 'E2'
              acidRef.current?.triggerAttackRelease(note, '16n', time)
            }
          }
        }, '16n').start(0),
        new Tone.Loop((time) => {
          const chord = getConnectedChord(
            [...activeKeysRef.current],
            handsRef.current,
            presetRef.current,
          )

          if (chord) {
            const note = chord.notes[arpStepRef.current % chord.notes.length]
            arpRef.current?.triggerAttackRelease(note, '16n', time)
            arpStepRef.current += 1
          }
        }, '8n').start(0),
        new Tone.Loop(() => {
          beatStepRef.current += 1
        }, '16n').start(0),
        new Tone.Loop(() => {
          const state = looperStateRef.current

          if (state === 'idle' || state === 'playing') {
            return
          }

          const pattern = looperPatternRef.current

          if (pattern.length === 0) {
            return
          }

          if (state === 'armed') {
            if (Tone.Transport.ticks < looperArmTickRef.current) {
              return
            }

            looperRecordedRef.current = 0
            setLooperState('recording')
          }

          const slot = pattern[loopStep(pattern.length)]
          slot.clear()

          for (const key of BEAT_KEYS) {
            if (activeKeysRef.current.has(key)) {
              slot.add(key)
            }
          }

          looperRecordedRef.current += 1

          if (looperRecordedRef.current >= pattern.length) {
            setLooperState('playing')
          }
        }, '16n').start(0),
      ]
    }

    syncSamples(currentPreset, masterRef.current)
    updateFromSignal(useRaveStore.getState().signal, currentPreset)

    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start()
    }

    setAudioReady(true)
  }, [isBeatActive, setAudioReady, setLooperState, updateFromSignal])

  const looperArm = useCallback(() => {
    if (!bassRef.current) {
      return
    }

    const bars = Math.max(1, useRaveStore.getState().looperBars)
    looperPatternRef.current = Array.from(
      { length: bars * 16 },
      () => new Set<ControlKey>(),
    )

    const ticksPerBar = Tone.Transport.PPQ * 4
    looperArmTickRef.current =
      Math.ceil((Tone.Transport.ticks + 1) / ticksPerBar) * ticksPerBar
    looperRecordedRef.current = 0
    setLooperState('armed')
  }, [setLooperState])

  const looperClear = useCallback(() => {
    looperPatternRef.current = []
    looperRecordedRef.current = 0
    setLooperState('idle')
  }, [setLooperState])

  const stopAudio = useCallback(() => {
    bassRef.current?.triggerRelease()
    leadRef.current?.releaseAll()
    padRef.current?.releaseAll()
    acidRef.current?.triggerRelease()
    activeKeysRef.current.clear()
    activeLeadNotesRef.current.clear()
    activePadNotesRef.current.clear()
    activeBassNoteRef.current = null
    looperPatternRef.current = []
    looperRecordedRef.current = 0
    setLooperState('idle')
    setAudioReady(false)
  }, [setAudioReady, setLooperState])

  useEffect(() => {
    presetRef.current = preset
    syncSamples(preset, masterRef.current)
    updateFromSignal(useRaveStore.getState().signal, preset)
  }, [preset, updateFromSignal])

  useEffect(() => {
    const unsubscribe = useRaveStore.subscribe((state, previousState) => {
      if (state.signal === previousState.signal) {
        return
      }

      updateFromSignal(state.signal, presetRef.current)
    })

    updateFromSignal(useRaveStore.getState().signal, presetRef.current)

    return unsubscribe
  }, [updateFromSignal])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    const debug = globalThis as {
      raveLooper?: () => unknown
      raveMaster?: () => Tone.ToneAudioNode | null
    }
    debug.raveLooper = () => ({
      state: looperStateRef.current,
      recorded: looperRecordedRef.current,
      pattern: looperPatternRef.current.map((keys) => [...keys]),
    })
    debug.raveMaster = () => masterRef.current
  }, [])

  useEffect(
    () => () => {
      Tone.Transport.stop()
      loopsRef.current.forEach((loop) => loop.dispose())
      bassRef.current?.dispose()
      leadRef.current?.dispose()
      padRef.current?.dispose()
      arpRef.current?.dispose()
      kickRef.current?.dispose()
      clapRef.current?.dispose()
      hatRef.current?.dispose()
      acidRef.current?.dispose()
      filterRef.current?.dispose()
      delayRef.current?.dispose()
      reverbRef.current?.dispose()
      driveRef.current?.dispose()
      Object.values(samplePlayersRef.current).forEach((player) => player.dispose())
    },
    [],
  )

  return { startAudio, stopAudio, looperArm, looperClear }

  function syncSamples(nextPreset: MusicPreset, output: Tone.ToneAudioNode | null) {
    if (!output || samplePresetRef.current === nextPreset.id) {
      return
    }

    Object.values(samplePlayersRef.current).forEach((player) => player.dispose())
    const samples = resolvePresetSamples(nextPreset)
    samplePlayersRef.current = Object.entries(samples).reduce<
      Partial<Record<SampleSlot, Tone.Player>>
    >((players, [slot, url]) => {
      players[slot as SampleSlot] = new Tone.Player({
        autostart: false,
        url,
        volume: SAMPLE_GAIN_DB[slot as SampleSlot] ?? 0,
      }).connect(output)

      return players
    }, {})
    samplePresetRef.current = nextPreset.id
  }

  function triggerSample(slot: SampleSlot, time: Tone.Unit.Time) {
    const player = samplePlayersRef.current[slot]

    if (!player?.loaded) {
      return false
    }

    player.start(time)
    return true
  }
}

// Per-slot playback trim (dB) so the softer one-shots carry over the pad wash.
const SAMPLE_GAIN_DB: Partial<Record<SampleSlot, number>> = {
  hat: 8,
  perc: 5,
  clap: 3,
  snare: 2,
}

function getHandMotion(hands: DetectedHand[], side: 'Left' | 'Right') {
  return (
    hands.find((hand) => hand.side === side)?.motion ?? {
      height: 0.45,
      openness: 0.35,
      roll: 0,
      spread: 0.35,
      tilt: 0,
      x: 0.5,
    }
  )
}

function normalizeAngle(value: number) {
  return Math.min(1, Math.abs(value) / Math.PI)
}

/**
 * Current 16th-note index within a looper pattern, derived from the absolute
 * transport position so recording and playback stay phase-locked regardless of
 * which bar recording started on.
 */
function loopStep(patternLength: number) {
  const ticksPerSixteenth = Tone.Transport.PPQ / 4

  return Math.floor(Tone.Transport.ticks / ticksPerSixteenth) % patternLength
}
