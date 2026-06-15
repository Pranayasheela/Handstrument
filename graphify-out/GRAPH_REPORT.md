# Graph Report - .  (2026-06-14)

## Corpus Check
- Corpus is ~20,174 words - fits in a single context window. You may not need a graph.

## Summary
- 205 nodes · 315 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_React UI Components|React UI Components]]
- [[_COMMUNITY_Gesture Control Domain|Gesture Control Domain]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_R3F Visual Scene|R3F Visual Scene]]
- [[_COMMUNITY_App TypeScript Config|App TypeScript Config]]
- [[_COMMUNITY_Node TypeScript Config|Node TypeScript Config]]
- [[_COMMUNITY_Hand Tracking Pipeline|Hand Tracking Pipeline]]
- [[_COMMUNITY_Dev Tooling|Dev Tooling]]
- [[_COMMUNITY_Audio Engine Presets|Audio Engine Presets]]
- [[_COMMUNITY_Product And Visual Identity|Product And Visual Identity]]
- [[_COMMUNITY_TS Project References|TS Project References]]
- [[_COMMUNITY_Agent Instructions|Agent Instructions]]
- [[_COMMUNITY_Graphify Workflow|Graphify Workflow]]
- [[_COMMUNITY_Icon Sprite Assets|Icon Sprite Assets]]
- [[_COMMUNITY_Favicon Identity|Favicon Identity]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `useRaveStore` - 10 edges
4. `getConnectedChord()` - 8 edges
5. `App()` - 6 edges
6. `MusicInfoPanel()` - 6 edges
7. `HandSignal` - 6 edges
8. `getChordLabel()` - 6 edges
9. `scripts` - 5 edges
10. `MusicPreset` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Electronic Neon Visual Identity` --semantically_similar_to--> `Futuristic Music Lab`  [INFERRED] [semantically similar]
  src/assets/hero.png → PRODUCT.md
- `React Logo` --conceptually_related_to--> `MediaPipe Tone React Three Fiber Zustand Stack`  [INFERRED]
  src/assets/react.svg → README.md
- `Vite Logo` --conceptually_related_to--> `MediaPipe Tone React Three Fiber Zustand Stack`  [INFERRED]
  src/assets/vite.svg → README.md
- `Two Hand Controls` --conceptually_related_to--> `Gesture Music Instrument`  [INFERRED]
  README.md → PRODUCT.md
- `MusicInfoPanel()` --calls--> `getAvailableSampleCount()`  [EXTRACTED]
  src/components/MusicInfoPanel.tsx → src/utils/audioSamples.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Portfolio Instrument Identity** — product_gesture_music_instrument, product_futuristic_music_lab, hero_electronic_visual_identity [INFERRED 0.85]
- **Project Tooling Stack** — readme_mediapipe_tone_r3f_zustand_stack, react_react_logo, vite_vite_logo [INFERRED 0.75]

## Communities (17 total, 5 thin omitted)

### Community 0 - "React UI Components"
Cohesion: 0.10
Nodes (26): ControlBank(), ControlBankProps, GenreSelector(), HandTracker(), GestureLine(), MusicInfoPanel(), MusicInfoPanelProps, normalizeAngle() (+18 more)

### Community 1 - "Gesture Control Domain"
Cohesion: 0.13
Nodes (21): BASE_CHORDS, BEAT_KEYS, CHORD_COLOR_KEYS, CHORD_COLORS, ChordColor, ControlKey, DetectedHand, FINGER_LABELS (+13 more)

### Community 2 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, clsx, lucide-react, @mediapipe/tasks-vision, react, react-dom, @react-three/drei, @react-three/fiber (+14 more)

### Community 3 - "R3F Visual Scene"
Cohesion: 0.11
Nodes (6): getArcPoints(), lerp(), RaveNodeScene, RaveNodeSceneProps, FINGER_CONTROLS, LEFT_CONTROLS

### Community 4 - "App TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 5 - "Node TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 6 - "Hand Tracking Pipeline"
Cohesion: 0.20
Nodes (12): HandTrackerProps, emptySignal, FingerId, HandSide, clamp01(), clearCanvas(), createHandLandmarker(), drawHandOverlay() (+4 more)

### Community 7 - "Dev Tooling"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/node, @types/react (+6 more)

### Community 8 - "Audio Engine Presets"
Cohesion: 0.27
Nodes (7): MusicPreset, SampleSlot, audioFiles, audioModules, getAvailableSampleCount(), resolvePresetSamples(), SampleMap

### Community 9 - "Product And Visual Identity"
Cohesion: 0.20
Nodes (10): Electronic Neon Visual Identity, Layered Neon Tiles, Futuristic Music Lab, Gesture Music Instrument, Product Strategy, React Logo, Hand Music Controller Overview, MediaPipe Tone React Three Fiber Zustand Stack (+2 more)

## Knowledge Gaps
- **96 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Tooling` to `Runtime Dependencies`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.10099573257467995 - nodes in this community are weakly interconnected._
- **Should `Gesture Control Domain` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `R3F Visual Scene` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `App TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._