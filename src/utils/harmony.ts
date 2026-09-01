import {
  BEAT_KEYS,
  HARMONY_KEYS,
  type ChordColor,
  type ControlKey,
  type DetectedHand,
  type HeightBand,
  type RaveChord,
} from '../domain/raveControls'
import type { MusicPreset } from '../domain/musicPresets'

type ChordVoicing = { bassNote: string; notes: string[] }

/**
 * Each chord is voiced deliberately so the four chords in a progression contrast
 * in quality *and* register, and the three presets feel like different genres:
 * Joji = intimate close voicings, Rave = wide two-octave stacks, Lo-fi = jazzy
 * 7th/9th shapes that jump between low and bright.
 */
const CHORD_LIBRARY: Record<string, ChordVoicing> = {
  // Joji Noir — melancholic alt-R&B, close and emotive
  Bm9: { bassNote: 'B1', notes: ['B3', 'D4', 'F#4', 'A4', 'C#5'] },
  Gmaj7: { bassNote: 'G1', notes: ['G3', 'B3', 'D4', 'F#4'] },
  Em7: { bassNote: 'E1', notes: ['E3', 'G3', 'B3', 'D4'] },
  'F#7': { bassNote: 'F#1', notes: ['A#3', 'C#4', 'E4', 'F#4'] },

  // Rave Bloom — euphoric festival major, wide and bright
  Ab: { bassNote: 'Ab1', notes: ['Ab3', 'C4', 'Eb4', 'Ab4', 'C5'] },
  Eb: { bassNote: 'Eb1', notes: ['Eb3', 'G3', 'Bb3', 'Eb4', 'G4'] },
  Fm: { bassNote: 'F1', notes: ['F3', 'Ab3', 'C4', 'F4', 'Ab4'] },
  Db: { bassNote: 'Db1', notes: ['Db3', 'F3', 'Ab3', 'Db4', 'F4'] },

  // Lo-fi Pulse — bedroom jazz, 7th/9th shapes across the register
  Am9: { bassNote: 'A1', notes: ['A3', 'C4', 'E4', 'G4', 'B4'] },
  D9: { bassNote: 'D1', notes: ['D3', 'F#3', 'C4', 'E4'] },
  Bm7: { bassNote: 'B1', notes: ['B2', 'D3', 'F#3', 'A3'] },
  Cmaj7: { bassNote: 'C2', notes: ['C4', 'E4', 'G4', 'B4', 'D5'] },
}

const FALLBACK_CHORD: ChordVoicing = {
  bassNote: 'A1',
  notes: ['A3', 'C4', 'E4'],
}

export function getConnectedChord(
  activeKeys: ControlKey[],
  hands: DetectedHand[] = [],
  preset: MusicPreset,
): RaveChord | null {
  const rightKey = HARMONY_KEYS.find((key) => activeKeys.includes(key))

  if (!rightKey) {
    return null
  }

  const leftKey =
    BEAT_KEYS.find((key) => activeKeys.includes(key)) ?? ('Left-thumb' as ControlKey)
  const rightHand = hands.find((hand) => hand.side === 'Right')
  const profile = getExpressionProfile(rightHand)
  const chordName = getChordNameFromKey(rightKey, preset)
  const base = CHORD_LIBRARY[chordName] ?? FALLBACK_CHORD
  const extensions = colorExtensions(base.notes, profile.color)
  const notes = applyInversion(
    uniqueNotes([...base.notes, ...extensions]),
    profile.inversion,
  )

  return {
    altitudeName: profile.heightName,
    bassNote: base.bassNote,
    color: profile.color,
    colorName: profile.colorName,
    complexity: notes.length,
    heightBand: profile.heightBand,
    inversionName: profile.inversionName,
    leftKey,
    name: `${chordName} ${profile.colorName} ${profile.heightName}`,
    notes,
    rightKey,
  }
}

export function getChordLabel(
  activeKeys: ControlKey[],
  hands: DetectedHand[] = [],
  preset: MusicPreset,
) {
  const chord = getConnectedChord(activeKeys, hands, preset)

  return chord ? `${chord.name} (${chord.inversionName})` : 'Sin acorde'
}

function getChordNameFromKey(key: ControlKey, preset: MusicPreset) {
  const index = Math.max(0, HARMONY_KEYS.indexOf(key))

  return preset.progression[index % preset.progression.length]
}

function getExpressionProfile(hand?: DetectedHand) {
  const height = hand?.motion.height ?? 0.45
  const openness = Math.max(hand?.motion.openness ?? 0.35, hand?.motion.spread ?? 0.35)
  const roll = hand?.motion.roll ?? 0
  const tilt = normalizeAngle(hand?.motion.tilt ?? 0)
  const heightBand: HeightBand = height > 0.68 ? 'high' : height > 0.38 ? 'mid' : 'low'
  const color: ChordColor =
    openness > 0.72
      ? 'octave'
      : heightBand === 'high' || tilt > 0.66
        ? 'seventh'
        : heightBand === 'mid' || tilt > 0.38
          ? 'add9'
          : 'triad'
  const colorName =
    color === 'octave'
      ? 'Open'
      : color === 'seventh'
        ? 'Bright'
        : color === 'add9'
          ? 'Wide'
          : 'Core'

  const inversion = roll > 0.22 ? 1 : roll < -0.22 ? 2 : 0
  const inversionName =
    inversion === 1 ? '1ra inversion' : inversion === 2 ? '2da inversion' : 'Root'

  return {
    color,
    colorName,
    heightBand,
    heightName: getHeightName(heightBand),
    inversion,
    inversionName,
  }
}

/**
 * Hand "colour" stacks consonant octaves / a 9th on top of the voiced chord, so
 * opening the hand widens and brightens the same chord without ever clashing
 * with its own quality (works over major, minor and dominant shapes alike).
 */
function colorExtensions(notes: string[], color: ChordColor): string[] {
  const root = notes[0]

  switch (color) {
    case 'add9':
      return [transposeSemitones(root, 14)]
    case 'seventh':
      return [transposeSemitones(root, 14), transposeSemitones(root, 19)]
    case 'octave':
      return [transposeSemitones(root, 12), transposeSemitones(root, 24)]
    default:
      return []
  }
}

function getHeightName(heightBand: HeightBand) {
  return {
    high: 'Alta',
    low: 'Baja',
    mid: 'Media',
  }[heightBand]
}

function uniqueNotes(notes: string[]) {
  return [...new Set(notes)]
}

function applyInversion(notes: string[], inversion: number) {
  if (inversion === 0) {
    return notes
  }

  return notes.map((note, index) =>
    index < inversion ? transposeSemitones(note, 12) : note,
  )
}

const SEMITONE_BY_NAME: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

const NAME_BY_SEMITONE = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

function transposeSemitones(note: string, semitones: number) {
  const match = note.match(/^([A-G][#b]?)(-?\d+)$/)

  if (!match) {
    return note
  }

  const midi = (Number(match[2]) + 1) * 12 + (SEMITONE_BY_NAME[match[1]] ?? 0)
  const shifted = midi + semitones

  return NAME_BY_SEMITONE[((shifted % 12) + 12) % 12] + (Math.floor(shifted / 12) - 1)
}

function normalizeAngle(value: number) {
  return Math.min(1, Math.abs(value) / Math.PI)
}
