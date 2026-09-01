import type { HandMotion } from './raveControls'

/** A captured low/high observed range for one continuous gesture axis. */
export type Range = { min: number; max: number }

/**
 * Per-user gesture calibration. Webcam framing and hand size mean one person's
 * "hand raised high" might only read as 0.6, while another's reads 0.9. These
 * ranges remap each person's comfortable movement back onto the full 0..1 the
 * engine expects. `fingerSensitivity` scales the finger-raise detection
 * threshold (lower = registers a raised finger more easily).
 */
export type Calibration = {
  fingerSensitivity: number
  height: Range
  x: Range
  spread: Range
}

export const FINGER_SENSITIVITY_RANGE = { min: 0.4, max: 1.8, step: 0.1 }

export const DEFAULT_CALIBRATION: Calibration = {
  fingerSensitivity: 1,
  height: { min: 0, max: 1 },
  x: { min: 0, max: 1 },
  spread: { min: 0, max: 1 },
}

const STORAGE_KEY = 'hmc.calibration'
/** Below this span an axis is treated as "not calibrated" and passed through. */
const MIN_SPAN = 0.12

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function remap(value: number, range: Range) {
  const span = range.max - range.min

  if (span < MIN_SPAN) {
    return clamp01(value)
  }

  return clamp01((value - range.min) / span)
}

/** Apply calibration to raw tracker motion. Angles are left untouched. */
export function applyCalibration(motion: HandMotion, calibration: Calibration): HandMotion {
  return {
    ...motion,
    height: remap(motion.height, calibration.height),
    x: remap(motion.x, calibration.x),
    spread: remap(motion.spread, calibration.spread),
  }
}

/** True once the user has moved any axis away from the defaults. */
export function isCalibrated(calibration: Calibration) {
  return (
    calibration.fingerSensitivity !== DEFAULT_CALIBRATION.fingerSensitivity ||
    calibration.height.max - calibration.height.min < 1 - MIN_SPAN ||
    calibration.x.max - calibration.x.min < 1 - MIN_SPAN ||
    calibration.spread.max - calibration.spread.min < 1 - MIN_SPAN
  )
}

/**
 * Tighten a captured range slightly so the user reaches full scale a touch
 * before their physical limit, and fall back to the full range if the capture
 * was too narrow to be useful.
 */
export function finalizeRange(range: Range): Range {
  if (range.max - range.min < MIN_SPAN) {
    return { min: 0, max: 1 }
  }

  const headroom = 0.03
  return {
    min: clamp01(range.min + headroom),
    max: clamp01(range.max - headroom),
  }
}

export function loadCalibration(): Calibration {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null

    return raw ? normalize(JSON.parse(raw)) : DEFAULT_CALIBRATION
  } catch {
    return DEFAULT_CALIBRATION
  }
}

export function saveCalibration(calibration: Calibration) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration))
    }
  } catch {
    // storage can be unavailable (private mode); calibration just won't persist.
  }
}

function normalize(value: unknown): Calibration {
  if (!value || typeof value !== 'object') {
    return DEFAULT_CALIBRATION
  }

  const raw = value as Partial<Calibration>

  return {
    fingerSensitivity: clampNumber(
      raw.fingerSensitivity,
      DEFAULT_CALIBRATION.fingerSensitivity,
      FINGER_SENSITIVITY_RANGE.min,
      FINGER_SENSITIVITY_RANGE.max,
    ),
    height: normalizeRange(raw.height),
    x: normalizeRange(raw.x),
    spread: normalizeRange(raw.spread),
  }
}

function normalizeRange(value: unknown): Range {
  if (!value || typeof value !== 'object') {
    return { min: 0, max: 1 }
  }

  const raw = value as Partial<Range>
  const min = clampNumber(raw.min, 0, 0, 1)
  const max = clampNumber(raw.max, 1, 0, 1)

  return max > min ? { min, max } : { min: 0, max: 1 }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback
}
