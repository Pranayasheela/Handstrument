# AGENTS.md

## Project Stack

- Vite + React 19 + TypeScript
- MediaPipe Tasks Vision for webcam hand tracking
- Tone.js for audio synthesis, samples, transport, and effects
- React Three Fiber, Drei, and Three.js for animated 3D visuals
- Zustand for shared app/session state
- Tailwind CSS v4 plugin is installed, but most UI styling lives in `src/App.css`
- Lucide React for UI icons

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npx tsc -b`
- Preview build: `npm run preview`
- Tests: no test script is currently configured

## Main Folders

- `src/components`: UI, hand tracker, info panels, and R3F scene components
- `src/domain`: presets, gesture/control types, and static control maps
- `src/hooks`: audio engine hooks
- `src/store`: Zustand store
- `src/utils`: MediaPipe helpers, audio sample lookup, harmony logic
- `src/audio`: optional local audio samples
- `public`: static icons/assets

## Coding Conventions

- Keep feature logic out of `App.tsx`; compose components there and place behavior in `components`, `hooks`, `store`, `domain`, or `utils`.
- Prefer existing domain types from `src/domain/raveControls.ts`.
- Use Zustand for shared gesture/audio/UI state instead of prop-drilling new global state.
- Keep the Tone.js engine isolated in `useRaveEngine`.
- Keep MediaPipe/camera logic isolated in `HandTracker` and `utils/handTracking.ts`.
- For gesture changes, preserve the left hand's core beat behavior: fingers should continue to trigger kick, hat, snare, clap, and perc reliably.
- Use `useMemo`, `useCallback`, refs, and direct Zustand subscriptions where they reduce high-frequency render work.
- For repeated Three.js objects, prefer instancing or buffer geometry when practical.

## Design Rules

- The app is an instrument UI, not a landing page. Keep the playable controls visible and compact.
- Preserve the rave/electronic visual direction: dark background, neon accents, animated nodes, and reactive 3D visuals.
- Keep camera and control panels small enough that the 3D scene remains visible.
- Use Lucide icons for controls/status where an icon fits.
- Avoid large decorative cards, oversized marketing sections, and text that explains obvious UI behavior inside the app.
- Keep border radii modest, around 8px unless matching an existing style.
- Ensure text fits on mobile and desktop panels without overlapping.

## Restrictions

- Do not add new libraries unless the existing stack cannot reasonably solve the task.
- Do not replace MediaPipe, Tone.js, Zustand, or React Three Fiber without explicit user approval.
- Do not break camera permission flow or browser audio gesture requirements.
- Do not commit generated build output unless explicitly requested.
- Do not remove or rewrite unrelated user changes.
- Avoid destructive git commands.

## Validation Before Finishing

Run these before reporting completion:

```bash
npm run lint
npx tsc -b
```

When changing build configuration, dependencies, or production behavior, also run:

```bash
npm run build
```

For UI/visual changes, manually verify the app in the browser at the Vite dev URL, usually `http://localhost:5173/`, and check desktop/mobile layout when relevant.
