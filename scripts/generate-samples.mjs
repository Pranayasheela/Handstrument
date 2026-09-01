/**
 * Offline drum-sample generator.
 *
 * Synthesises the 15 one-shot drum samples the music presets look for
 * (`src/domain/musicPresets.ts` -> `sampleHints`) and writes them to
 * `src/audio/` as 16-bit / 44.1 kHz mono WAV files. These are layered,
 * carefully enveloped one-shots — richer than the real-time Tone.js synth
 * fallback and free of any licensing question. Drop your own `.wav` / `.mp3`
 * / `.ogg` files into `src/audio/` with the same names to override them.
 *
 * Run: `npm run samples`
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 44100
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'audio')

// --- deterministic PRNG (mulberry32) so regeneration is reproducible ---------
function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- synthesis primitives (return Float32Array, roughly -1..1) --------------
function osc(seconds, { freq, freqEnd = freq, pitchTau = 0.03, ampTau = 0.15, attack = 0.001, amp = 1, type = 'sine' }) {
  const n = Math.ceil(seconds * SAMPLE_RATE)
  const out = new Float32Array(n)
  let phase = 0

  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE
    const f = freqEnd + (freq - freqEnd) * Math.exp(-t / pitchTau)
    phase += (2 * Math.PI * f) / SAMPLE_RATE

    let s = Math.sin(phase)
    if (type === 'square') s = Math.sign(s)
    else if (type === 'tri') s = (2 / Math.PI) * Math.asin(Math.sin(phase))

    const env = Math.min(1, t / attack) * Math.exp(-t / ampTau)
    out[i] = s * env * amp
  }

  return out
}

function noise(seconds, rng, { ampTau = 0.1, attack = 0.0005, amp = 1 }) {
  const n = Math.ceil(seconds * SAMPLE_RATE)
  const out = new Float32Array(n)

  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE
    const env = Math.min(1, t / attack) * Math.exp(-t / ampTau)
    out[i] = (rng() * 2 - 1) * env * amp
  }

  return out
}

function lowpass(buf, cutoff) {
  const out = new Float32Array(buf.length)
  const dt = 1 / SAMPLE_RATE
  const alpha = dt / (1 / (2 * Math.PI * cutoff) + dt)
  let y = 0

  for (let i = 0; i < buf.length; i += 1) {
    y += alpha * (buf[i] - y)
    out[i] = y
  }

  return out
}

function highpass(buf, cutoff) {
  const out = new Float32Array(buf.length)
  const dt = 1 / SAMPLE_RATE
  const rc = 1 / (2 * Math.PI * cutoff)
  const alpha = rc / (rc + dt)
  let prevIn = 0
  let prevOut = 0

  for (let i = 0; i < buf.length; i += 1) {
    const y = alpha * (prevOut + buf[i] - prevIn)
    out[i] = y
    prevIn = buf[i]
    prevOut = y
  }

  return out
}

const bandpass = (buf, low, high) => highpass(lowpass(buf, high), low)

function mix(parts) {
  const n = Math.max(...parts.map((p) => p.length))
  const out = new Float32Array(n)
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) out[i] += part[i]
  }
  return out
}

const gain = (buf, g) => buf.map((v) => v * g)

const softClip = (buf, drive) => buf.map((v) => Math.tanh(v * drive))

function bitcrush(buf, bits, downsample) {
  const levels = 2 ** bits
  const out = new Float32Array(buf.length)
  let hold = 0

  for (let i = 0; i < buf.length; i += 1) {
    if (i % downsample === 0) hold = Math.round(buf[i] * levels) / levels
    out[i] = hold
  }

  return out
}

function fadeOut(buf, ms = 4) {
  const f = Math.min(buf.length, Math.ceil((ms / 1000) * SAMPLE_RATE))
  for (let i = 0; i < f; i += 1) buf[buf.length - 1 - i] *= i / f
  return buf
}

/** Drop trailing near-silence so one-shots stay short and don't overlap. */
function trim(buf, floor = 0.004) {
  let end = buf.length
  while (end > 1 && Math.abs(buf[end - 1]) < floor) end -= 1
  const pad = Math.ceil(0.004 * SAMPLE_RATE)
  return fadeOut(buf.slice(0, Math.min(buf.length, end + pad)), 6)
}

function normalize(buf, peak = 0.89) {
  let max = 0
  for (let i = 0; i < buf.length; i += 1) max = Math.max(max, Math.abs(buf[i]))
  return max === 0 ? buf : gain(buf, peak / max)
}

function metallicHat(seconds, hp, rng) {
  const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21]
  const partials = ratios.map((r) =>
    osc(seconds, { freq: 40 * r, ampTau: seconds / 4, amp: 0.3, type: 'square' }),
  )
  const shimmer = noise(seconds, rng, { ampTau: seconds / 4, amp: 0.5 })
  return highpass(mix([...partials, shimmer]), hp)
}

// --- one-shot recipes ------------------------------------------------------
function kick({ f0, f1, pitchTau, ampTau, click, drive }, rng) {
  const body = osc(ampTau * 4, { freq: f0, freqEnd: f1, pitchTau, ampTau })
  const transient = highpass(noise(0.02, rng, { ampTau: 0.006, amp: click }), 1400)
  return softClip(mix([body, transient]), drive)
}

function snare({ toneFreq, toneTau, noiseTau, low, high, noiseAmp }, rng) {
  const t1 = osc(toneTau * 3, { freq: toneFreq, freqEnd: toneFreq * 0.7, pitchTau: 0.04, ampTau: toneTau, amp: 0.7 })
  const t2 = osc(toneTau * 3, { freq: toneFreq * 1.68, ampTau: toneTau * 0.7, amp: 0.35 })
  const body = bandpass(noise(noiseTau * 4, rng, { ampTau: noiseTau, amp: noiseAmp }), low, high)
  return mix([t1, t2, body])
}

function hat({ decayTau, hp, metal }, rng) {
  const seconds = decayTau * 4
  const metallic = metallicHat(seconds, hp, rng)
  const air = highpass(noise(seconds, rng, { ampTau: decayTau, amp: 1 }), hp)
  const shaped = mix([gain(metallic, metal), gain(air, 1 - metal * 0.4)])
  return shaped.map((v, i) => v * Math.exp(-(i / SAMPLE_RATE) / decayTau))
}

function clap({ bursts, spacingMs, burstTau, tailTau, low, high }, rng) {
  const total = (spacingMs * bursts) / 1000 + tailTau * 4
  const out = new Float32Array(Math.ceil(total * SAMPLE_RATE))

  for (let b = 0; b < bursts; b += 1) {
    const offset = Math.floor(((spacingMs * b) / 1000) * SAMPLE_RATE)
    const burst = noise(burstTau * 4, rng, { ampTau: burstTau, amp: 1 })
    for (let i = 0; i < burst.length && offset + i < out.length; i += 1) out[offset + i] += burst[i]
  }

  const tailOffset = Math.floor(((spacingMs * bursts) / 1000) * SAMPLE_RATE)
  const tail = noise(tailTau * 4, rng, { ampTau: tailTau, amp: 0.55 })
  for (let i = 0; i < tail.length && tailOffset + i < out.length; i += 1) out[tailOffset + i] += tail[i]

  return bandpass(out, low, high)
}

function tom({ f0, f1, ampTau, drive }) {
  return softClip(osc(ampTau * 4, { freq: f0, freqEnd: f1, pitchTau: 0.09, ampTau }), drive)
}

function foley({ knockFreq, ampTau }, rng) {
  const knock = osc(ampTau * 4, { freq: knockFreq, freqEnd: knockFreq * 0.8, pitchTau: 0.02, ampTau, type: 'tri', amp: 0.8 })
  const tick = highpass(noise(0.03, rng, { ampTau: 0.01, amp: 0.4 }), 2500)
  return mix([knock, tick])
}

// --- preset "voicing" applied after synthesis ----------------------------
const VOICE = {
  joji: (buf) => normalize(lowpass(buf, 9000), 0.8),
  rave: (buf) => normalize(softClip(buf, 1.4), 0.93),
  lofi: (buf) => normalize(bitcrush(lowpass(buf, 5200), 11, 2), 0.82),
}

const SAMPLES = {
  // Joji Noir - soft, dark, intimate
  'joji-kick.wav': (r) => VOICE.joji(kick({ f0: 118, f1: 45, pitchTau: 0.045, ampTau: 0.1, click: 0.22, drive: 1.1 }, r)),
  'joji-hat-shaker.wav': (r) => VOICE.joji(bandpass(hat({ decayTau: 0.03, hp: 6500, metal: 0.25 }, r), 5000, 12000)),
  'joji-snare-rim.wav': (r) => VOICE.joji(snare({ toneFreq: 330, toneTau: 0.035, noiseTau: 0.05, low: 1400, high: 6500, noiseAmp: 0.5 }, r)),
  'joji-clap-snap.wav': (r) => VOICE.joji(clap({ bursts: 1, spacingMs: 0, burstTau: 0.02, tailTau: 0.04, low: 1100, high: 5200 }, r)),
  'joji-perc-foley.wav': (r) => VOICE.joji(foley({ knockFreq: 320, ampTau: 0.045 }, r)),

  // Rave Bloom - punchy, bright, big
  'rave-kick.wav': (r) => VOICE.rave(kick({ f0: 200, f1: 50, pitchTau: 0.028, ampTau: 0.12, click: 0.6, drive: 1.7 }, r)),
  'rave-hat-openhat.wav': (r) => VOICE.rave(hat({ decayTau: 0.12, hp: 8000, metal: 0.55 }, r)),
  'rave-snare.wav': (r) => VOICE.rave(snare({ toneFreq: 210, toneTau: 0.05, noiseTau: 0.13, low: 900, high: 9000, noiseAmp: 1 }, r)),
  'rave-clap.wav': (r) => VOICE.rave(clap({ bursts: 4, spacingMs: 9, burstTau: 0.01, tailTau: 0.09, low: 1000, high: 7000 }, r)),
  'rave-perc-tom.wav': (r) => VOICE.rave(tom({ f0: 190, f1: 110, ampTau: 0.12, drive: 1.3 }, r)),

  // Lo-fi Pulse - warm, crushed, granular
  'lofi-kick.wav': (r) => VOICE.lofi(kick({ f0: 92, f1: 42, pitchTau: 0.038, ampTau: 0.1, click: 0.18, drive: 1.2 }, r)),
  'lofi-hat-vinyl.wav': (r) => VOICE.lofi(mix([hat({ decayTau: 0.035, hp: 6000, metal: 0.3 }, r), noise(0.12, r, { ampTau: 0.09, amp: 0.05 })])),
  'lofi-snare-rim.wav': (r) => VOICE.lofi(snare({ toneFreq: 300, toneTau: 0.04, noiseTau: 0.08, low: 1200, high: 5000, noiseAmp: 0.6 }, r)),
  'lofi-clap-snap.wav': (r) => VOICE.lofi(clap({ bursts: 2, spacingMs: 11, burstTau: 0.015, tailTau: 0.05, low: 900, high: 4200 }, r)),
  'lofi-perc-noise.wav': (r) => VOICE.lofi(bandpass(noise(0.16, r, { ampTau: 0.1, amp: 1 }), 800, 3000)),
}

// --- WAV encode + write ---------------------------------------------------
function encodeWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }

  return buffer
}

mkdirSync(OUT_DIR, { recursive: true })

let seed = 1
for (const [name, build] of Object.entries(SAMPLES)) {
  seed += 1
  const raw = build(makeRng(seed * 8419))
  // Final normalize is after the high-pass so filter overshoot can't clip the encode.
  const finished = trim(normalize(highpass(raw, 18), 0.93))
  writeFileSync(join(OUT_DIR, name), encodeWav(finished))
  console.log(`  ${name}  (${(finished.length / SAMPLE_RATE).toFixed(3)}s)`)
}

console.log(`\nWrote ${Object.keys(SAMPLES).length} samples to src/audio/`)
