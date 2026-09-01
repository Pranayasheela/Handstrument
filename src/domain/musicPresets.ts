export type SampleSlot = 'kick' | 'hat' | 'snare' | 'clap' | 'perc'

export type MusicPreset = {
  id: string
  name: string
  artistReference: string
  bpm: number
  mood: string
  scale: string
  progression: string[]
  texture: string
  sampleHints: Record<SampleSlot, string[]>
}

export const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'joji-noir',
    name: 'Joji Noir',
    artistReference: 'Alt R&B / melancholic pop',
    bpm: 76,
    mood: 'melancolico, nocturno, aireado',
    progression: ['Bm9', 'Gmaj7', 'Em7', 'F#7'],
    sampleHints: {
      clap: ['joji', 'clap', 'snap'],
      hat: ['joji', 'hat', 'shaker'],
      kick: ['joji', 'kick'],
      perc: ['joji', 'perc', 'foley'],
      snare: ['joji', 'snare', 'rim'],
    },
    scale: 'B minor · i9 – VImaj7 – iv7 – V7',
    texture: 'Pads suaves y cercanos, bajo contenido, con un V7 que tira de vuelta a casa.',
  },
  {
    id: 'rave-bloom',
    name: 'Rave Bloom',
    artistReference: 'Festival rave / melodic house',
    bpm: 140,
    mood: 'luminoso, euforico, grande',
    progression: ['Ab', 'Eb', 'Fm', 'Db'],
    sampleHints: {
      clap: ['rave', 'clap'],
      hat: ['rave', 'hat', 'openhat'],
      kick: ['rave', 'kick'],
      perc: ['rave', 'perc', 'tom'],
      snare: ['rave', 'snare'],
    },
    scale: 'Ab mayor · I – V – vi – IV',
    texture: 'Kick firme, hats rapidos y acordes mayores anchos de dos octavas.',
  },
  {
    id: 'lofi-pulse',
    name: 'Lo-fi Pulse',
    artistReference: 'Downtempo / bedroom beat',
    bpm: 92,
    mood: 'calido, intimo, quebrado',
    progression: ['Am9', 'D9', 'Bm7', 'Cmaj7'],
    sampleHints: {
      clap: ['lofi', 'clap', 'snap'],
      hat: ['lofi', 'hat', 'vinyl'],
      kick: ['lofi', 'kick'],
      perc: ['lofi', 'perc', 'noise'],
      snare: ['lofi', 'snare', 'rim'],
    },
    scale: 'G mayor (jazz) · ii9 – V9 – iii7 – IVmaj7',
    texture: 'Golpes suaves, ruido de textura y acordes de septima y novena.',
  },
]

export const DEFAULT_PRESET_ID = MUSIC_PRESETS[0].id

export function getMusicPreset(id: string) {
  return (
    MUSIC_PRESETS.find((preset) => preset.id === id) ??
    MUSIC_PRESETS.find((preset) => preset.id === DEFAULT_PRESET_ID) ??
    MUSIC_PRESETS[0]
  )
}
