# Handstrument

Turn your **hands** (or your **keyboard**) into an expressive electronic music
instrument, right in the browser. A webcam tracks your hands in real time; your
gestures play drums, chords, bass and arpeggios and drive reactive 3D visuals.

No installs for the player — it all runs client-side. The camera feed never
leaves your machine.

> Handstrument started from a small open-source hand-tracking demo and grew into a
> full instrument: keyboard play, gesture calibration, a rhythm looper, a
> dependency-free drum-sample engine, and reworked harmony. To put it online,
> deploy your own copy (see **Deploy**).

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [How it works (the pipeline)](#how-it-works-the-pipeline)
- [Playing it](#playing-it)
  - [Hand controls](#hand-controls)
  - [Keyboard mode](#keyboard-mode)
- [The Studio panel](#the-studio-panel)
  - [Gesture calibration](#gesture-calibration)
  - [Rhythm looper](#rhythm-looper)
  - [Recording a performance](#recording-a-performance)
- [Presets](#presets)
  - [Music presets & the chord system](#music-presets--the-chord-system)
  - [Visual presets](#visual-presets)
- [Drum samples](#drum-samples)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Browser support & requirements](#browser-support--requirements)
- [Developer notes](#developer-notes)
- [Credits](#credits)

---

## What it does

| Your input | What happens |
| --- | --- |
| **Left hand** raises fingers | Triggers **drums** — thumb = kick, index = hi-hat, middle = snare, ring = clap, pinky = perc. Hand height / openness / horizontal position change beat density and accents. |
| **Right hand** raises fingers | Plays the **four chords** of the selected preset. The thumb "opens" the chord (wider voicing). Hand height sets the voicing brightness and the master filter; roll picks the inversion; tilt adds colour. |
| **Both hands together** | Drums + harmony at once, plus a live info panel and a 3D scene that pulses, tilts and lights up with your movement. |
| **Keyboard** (no webcam) | The same instrument, played from the keys. |
| **Looper** | Record a bar of drums and loop it so your hands are free for chords and fills. |

---

## Tech stack

Everything runs in the browser. There is **no backend**.

| Layer | Library / API | Why it's here |
| --- | --- | --- |
| **UI framework** | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/) | Component UI and a fully typed codebase. |
| **Build tool / dev server** | [Vite 8](https://vite.dev) | Instant dev server, hot-module reload, production bundling. |
| **Hand tracking** | [`@mediapipe/tasks-vision`](https://ai.google.dev/edge/mediapipe) (HandLandmarker) | A machine-learning model that finds 21 landmarks per hand from the webcam, ~30 fps. Runs **locally** via WebAssembly; the model file is fetched once from Google's CDN. This is the "AI" in the project. |
| **Audio engine** | [Tone.js 15](https://tonejs.github.io/) | Web Audio wrapper: synths (kick / snare / pad / bass / arp), a musical transport & step sequencer, and effects (filter, delay, reverb, distortion, limiter). Also plays the drum samples. |
| **3D visuals** | [three.js](https://threejs.org/) + [React Three Fiber](https://r3f.docs.pmnd.rs/) + [`@react-three/drei`](https://github.com/pmndrs/drei) | The animated "rave node" scene — a React-declarative wrapper over WebGL that reacts to the same gesture signal as the audio. |
| **State management** | [Zustand 5](https://zustand.docs.pmnd.rs/) | One small global store. Gesture data is high-frequency, so the store de-duplicates tiny changes and the engine subscribes to it directly instead of prop-drilling. |
| **Icons** | [`lucide-react`](https://lucide.dev/) | UI icons. |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) (installed) + `src/App.css` | Most component styling lives in the single `App.css`; Tailwind is available if you want it. |
| **Sample generation** | Node.js script, **zero dependencies** | `scripts/generate-samples.mjs` synthesizes the drum one-shots (see [Drum samples](#drum-samples)). |
| **Lint** | ESLint + `typescript-eslint` + React Hooks rules | `npm run lint`. |

---

## How it works (the pipeline)

```
                    ┌─────────────────────────────┐
  webcam ──► MediaPipe HandLandmarker ──►  readHandSignal(result, calibration)
                    │                             │   • which fingers are up  → activeKeys
  keyboard ─────────┼──► useKeyboardControls ─────┤   • hand height / openness / roll / tilt / x
                    │                             ▼
                    │                    ┌──────────────────┐
                    └───────────────────►│  Zustand store   │  (signal, presets, calibration,
                                         │  useRaveStore    │   looper state, …)
                                         └────────┬─────────┘
                        ┌─────────────────────────┼─────────────────────────┐
                        ▼                         ▼                         ▼
              ┌──────────────────┐     ┌────────────────────┐     ┌──────────────────┐
              │  useRaveEngine   │     │   RaveNodeScene     │     │   UI panels      │
              │  (Tone.js)       │     │   (React Three      │     │  ControlBank,    │
              │                  │     │    Fiber)           │     │  MusicInfoPanel, │
              │ • drum loops     │     │                     │     │  StatusPill …    │
              │ • pad / bass/arp │     │ • nodes pulse       │     │                  │
              │ • rhythm looper  │     │ • lights / lasers   │     └──────────────────┘
              │                  │     │ • camera tilt       │
              └──────────────────┘     └────────────────────┘
```

1. **Input** — either the webcam (MediaPipe) or the keyboard produces a
   `HandSignal`: a list of active finger keys plus a `motion` object per hand
   (`height`, `openness`, `roll`, `tilt`, `x`, `spread`).
2. **Calibration** is applied here (`readHandSignal`), remapping each person's
   real movement range onto the full `0..1` the engine expects.
3. The signal is committed to the **Zustand store**.
4. **`useRaveEngine`** (Tone.js) turns it into sound: five drum loops on a
   16th-note grid, a chord pad, a bass, and an arpeggiator — and it runs the
   looper.
5. **`RaveNodeScene`** (R3F) reads the same signal and animates the 3D scene.
6. The UI panels show live readouts.

Key rules baked in:

- **Audio only starts on a user gesture** (a button press) — a browser
  requirement.
- **The camera always wins** — keyboard input is ignored while the webcam is
  running.
- **The left hand's drum behaviour is never altered** by other features
  (including the looper, which only records the left hand).

---

## Playing it

1. Pick a **track / genre** and a **visual** from the two dropdowns.
2. Press **Iniciar rave**, allow camera access, and raise both hands.
   *No webcam?* See [Keyboard mode](#keyboard-mode).

### Hand controls

**Left hand — rhythm**

| Finger | Sound |
| --- | --- |
| Thumb | Kick |
| Index | Hi-hat |
| Middle | Snare |
| Ring | Clap |
| Pinky | Perc / texture |

Left-hand **height**, **openness** and **horizontal position** change beat
density, accents and hi-hat activity.

**Right hand — harmony**

| Finger | What it plays |
| --- | --- |
| Index / Middle / Ring / Pinky | The 1st / 2nd / 3rd / 4th chord of the preset progression |
| Thumb | **Chord colour** — opens the voicing (stacks octaves / a 9th) while held with a chord |

Right-hand **height** brightens the voicing and opens the master filter,
**roll** chooses the inversion, **tilt** adds colour.

### Keyboard mode

In the **Studio** panel turn on **Keyboard mode**, then **Start without camera**
to unlock audio. It pauses automatically whenever the webcam is running.

| Keys | Control |
| --- | --- |
| `A` `S` `D` `F` `G` | Left hand — kick, hat, snare, clap, perc |
| `J` `K` `L` `;` | Right hand — the four chords of the preset |
| `H` | Chord colour — hold **together with** a chord (silent on its own) |
| `↑` / `↓` | Right-hand height (voicing + filter) |
| `←` / `→` | Left-hand openness (beat density) |

---

## The Studio panel

A stack of compact cards below the display toggles. Each is optional and does
nothing until you switch it on.

### Gesture calibration

Webcam framing and hand size change how far a gesture reads — one person's "hand
raised high" might only reach 60%.

With the camera running, press **Calibrate range** and move both hands through
everything you use (high/low, left/right, open/closed). The panel records the
minimum and maximum it sees for each axis; press **Save range** and it stretches
that back to the full range.

There is also a **Finger sensitivity** slider (lower it if raised fingers are
missed, raise it if it triggers too eagerly).

Both settings are saved to `localStorage` and reload automatically. **Reset to
default** clears them.

### Rhythm looper

Turns a live jam into an arrangement.

1. Pick a length — **1, 2 or 4 bars**.
2. Press **Record loop**. Recording starts on the next bar; hold your
   **left-hand** drums through it.
3. When it completes it **plays back on repeat**, so both hands are free for
   chords, fills and expression. You can still play live drums *on top of* the
   loop.
4. **Clear loop** stops it.

Only the left-hand rhythm is looped — the right hand always stays live. Recording
and playback derive their position from the transport, so the loop stays
phase-locked to the beat.

### Recording a performance

There is **no in-app record button** — use your operating system's screen
recorder, which captures the visuals and the audio together:

- **Windows** — `Win` + `G` (Xbox Game Bar → Capture), or
  [OBS Studio](https://obsproject.com/).
- **macOS** — `Cmd` + `Shift` + `5`.
- **Any OS** — OBS Studio (also records a clean audio-only track).

Want a built-in button? It's a small addition: capture `canvas.captureStream(30)`
from the R3F `<canvas>` for video, route the Tone.js master through a
`MediaStreamAudioDestinationNode` for audio, feed both to one `MediaRecorder`
for a `.webm`, and add a `ScriptProcessorNode` tap for a `.wav`. Wire it into
`StudioRack` as another panel.

---

## Presets

### Music presets & the chord system

Defined in [`src/domain/musicPresets.ts`](src/domain/musicPresets.ts). Each
preset has a BPM, a scale, a four-chord progression, a mood, a texture blurb, and
filename hints for its drum samples.

| Preset | BPM | Progression | Character |
| --- | --- | --- | --- |
| **Joji Noir** | 76 | `Bm9 – Gmaj7 – Em7 – F#7` | Melancholic alt-R&B. Close, emotive voicings; the `F#7` is a bright dominant that pulls back home. |
| **Rave Bloom** | 140 | `Ab – Eb – Fm – Db` | Euphoric festival major (I–V–vi–IV). Wide two-octave chord stacks. |
| **Lo-fi Pulse** | 92 | `Am9 – D9 – Bm7 – Cmaj7` | Bedroom jazz. 7th/9th shapes that jump between low and bright registers. |

The chord engine lives in [`src/utils/harmony.ts`](src/utils/harmony.ts):

- **`CHORD_LIBRARY`** — each chord is *deliberately voiced*, so the four chords
  in a progression contrast in **quality** (major / minor / dominant / 9th)
  **and register**, and the three presets sound like different genres.
- **Hand "colour"** — openness / height / tilt pick a texture
  (`Core` → `Wide` → `Bright` → `Open`). `colorExtensions()` stacks consonant
  octaves and a 9th on top of the chord, so opening your hand widens the same
  chord without ever clashing with its quality.
- **Inversions** — right-hand roll rotates the voicing.

### Visual presets

Defined in [`src/domain/visualPresets.ts`](src/domain/visualPresets.ts). Each
one controls the canvas background, light colours, neon-grid and laser
intensity, particle density, and pulse scale:

`Neon Club` · `Joji Noir` · `Infrared` · `Aurora`

---

## Drum samples

The app ships with **15 drum one-shots** in [`src/audio/`](src/audio/) — kick,
hat, snare, clap and perc for each of the three presets. They are generated by:

```bash
npm run samples
```

which runs [`scripts/generate-samples.mjs`](scripts/generate-samples.mjs), a
**dependency-free** synthesizer that bakes layered, enveloped `.wav` one-shots
voiced per preset (Joji = soft/dark, Rave = punchy/bright, Lo-fi = crushed/
vinyl). The files are committed, so a fresh clone already has real samples;
regenerate any time you tweak the script. Every sample is peak-normalised and
DC-free.

**Using your own samples:** drop `.mp3`, `.wav` or `.ogg` files into `src/audio/`
whose names contain **every** keyword for a slot (see `sampleHints` in
`musicPresets.ts`) — e.g. `rave-kick.wav`, `lofi-snare-rim.wav`,
`joji-hat-shaker.wav`. A matching file overrides the generated one. If no file
matches a slot, the engine falls back to the Tone.js synth. Keep one-shots under
~0.6 s so they don't overlap at fast tempos. See
[`src/audio/README.md`](src/audio/README.md) for the full name table.

---

## Project structure

```
src/
  audio/                      generated drum one-shots (+ README)
  components/
    HandTracker.tsx           webcam + MediaPipe loop, draws the landmark overlay
    ControlBank.tsx           the finger → sound grid
    GenreSelector.tsx         music preset dropdown
    VisualSelector.tsx        visual preset dropdown
    RaveNodeScene.tsx         the React Three Fiber 3D scene
    MusicInfoPanel.tsx        live session readout (BPM, chord, gesture values)
    StatusPill.tsx            small status chips
    StudioRack.tsx            container for the Studio cards
    KeyboardPanel.tsx         keyboard mode toggle + key legend
    CalibrationPanel.tsx      gesture calibration capture UI
    LooperPanel.tsx           rhythm looper controls
  domain/
    musicPresets.ts           music presets (BPM, progression, scale, sample hints)
    visualPresets.ts          visual presets (colours, densities)
    raveControls.ts           shared types + finger → control maps
    calibration.ts            calibration model, remap math, localStorage
  hooks/
    useRaveEngine.ts          Tone.js audio engine + rhythm looper
    useKeyboardControls.ts    keyboard → synthetic HandSignal
  store/
    useRaveStore.ts           the single Zustand store
  utils/
    handTracking.ts           MediaPipe helpers, signal derivation, applies calibration
    audioSamples.ts           resolves preset → sample file (import.meta.glob)
    harmony.ts                chord library, voicings, expression colours
  App.tsx / App.css           composition + all component styling
scripts/
  generate-samples.mjs        the drum-sample synthesizer
```

Contributor conventions are in [`AGENTS.md`](AGENTS.md).

---

## Getting started

```bash
git clone https://github.com/Pranayasheela/handstrument.git
cd handstrument
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Deploy

It's a static site — any static host works (Vercel, Netlify, GitHub Pages).

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

For GitHub Pages, set Vite's `base` to your repo name in `vite.config.ts` before
building.

---

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
npm run lint       # ESLint
npm run samples    # regenerate src/audio/ drum one-shots
```

Type-check on its own: `npx tsc -b`

---

## Browser support & requirements

| Feature | Requirement |
| --- | --- |
| Core (hand tracking, audio, visuals) | Any current Chrome, Edge, Firefox or Safari with WebGL and a webcam |
| Keyboard mode | Any current browser — no webcam needed |
| Camera | Runs entirely locally. No video is uploaded or recorded by the app. |
| First load | Downloads the MediaPipe hand model (~8 MB) once from Google's CDN |

---

## Developer notes

- **Audio graph** — one `Tone.Limiter` master; a filter → distortion → delay →
  reverb chain; per-voice synths connect at different points. Drum loops check
  `isBeatActive(key)` = live key **or** the recorded looper pattern.
- **Gesture signal** — `useRaveStore`'s `getSignalSignature()` quantises the
  motion values so tiny webcam jitter doesn't spam re-renders, while real
  gestures still get through.
- **Calibration** stores both `motion` (post-calibration, drives audio/visuals)
  and `rawMotion` (pre-calibration, read by the calibration UI) on each
  `DetectedHand`.
- **DEV globals** — in `npm run dev` only, the console exposes
  `raveStore`, `raveLooper()` and `raveMaster()` for debugging.
  These are stripped from the production build.
- **No tests** are configured. `harmony.ts`, `calibration.ts` and the sample
  script are pure functions and the natural first place to add [Vitest](https://vitest.dev/).

---

## Credits

Built with these open-source projects:

- **Hand tracking** — [Google MediaPipe](https://ai.google.dev/edge/mediapipe) (Tasks Vision / HandLandmarker)
- **Audio** — [Tone.js](https://tonejs.github.io/)
- **3D visuals** — [three.js](https://threejs.org/) and [React Three Fiber](https://r3f.docs.pmnd.rs/)
- **State** — [Zustand](https://zustand.docs.pmnd.rs/) · **Icons** — [Lucide](https://lucide.dev/)

The initial project scaffold came from a small open-source hand-tracking demo;
the Studio features, sample engine and harmony rework in this repo were built on
top of it.
