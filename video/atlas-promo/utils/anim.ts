/**
 * Small, deterministic animation helpers. Every value in the film is a pure
 * function of time: no state, no randomness that is not seeded, so a frame
 * renders identically whether it is the first frame rendered or the last.
 */
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { EASE, type EaseName } from '../styles/tokens';

export const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0→1 over [start, start + dur], eased. */
export function prog(t: number, start: number, dur: number, ease: EaseName = 'emphasis'): number {
  if (dur <= 0) return t >= start ? 1 : 0;
  return EASE[ease](clamp01((t - start) / dur));
}

/** 1 inside the window with eased ramps in and out, 0 outside. */
export function windowed(t: number, start: number, end: number, fadeIn = 0.4, fadeOut = 0.4, ease: EaseName = 'emphasis'): number {
  return Math.min(prog(t, start, fadeIn, ease), 1 - prog(t, end - fadeOut, fadeOut, 'inOutSine'));
}

/** A keyframe: [time in seconds, value, ease used to arrive at this key]. */
export type Key = readonly [number, number, EaseName?];

/** Piecewise interpolation through keys sorted by time. Holds before the first and after the last. */
export function track(t: number, keys: readonly Key[]): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const e = EASE[ease ?? 'cinema'];
      return lerp(v0, v1, e(t1 === t0 ? 1 : (t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

/** Seconds since the start of the enclosing <Sequence> (or the film). */
export function useTime(): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
}

/** A seeded 0..1 hash, stable across renders. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Integer display of a counter climbing to `to`, with the site's emphasis curve. */
export function countTo(t: number, start: number, dur: number, to: number): number {
  return Math.round(prog(t, start, dur, 'outExpo') * to);
}
