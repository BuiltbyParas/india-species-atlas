/**
 * Noise on the CPU, for geometry built once.
 *
 * The field studies shape their grounds (dunes, mountains, a floodplain) on
 * the CPU when a world is built, not in a vertex shader, so the same height
 * can be asked for again from JavaScript — a line laid on the dunes, a pylon
 * set on the ground, a camera kept above a ridge. These functions are small,
 * deterministic and seeded, so a world is identical on every load.
 *
 * None of this is terrain data. Every ground built from it is labelled on
 * screen as an impression of a place, not a model of it.
 */

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** Smooth value noise, 0 → 1. */
export function noise2(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal value noise, 0 → ~1. */
export function fbm(x: number, y: number, octaves = 4, seed = 0): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * f, y * f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** Ridged fractal noise, 0 → 1: sharp crests, the shape of mountain ridges. */
export function ridged(x: number, y: number, octaves = 5, seed = 0): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let weight = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noise2(x * f, y * f, seed + i * 31) * 2 - 1);
    n *= n;
    n *= weight;
    weight = Math.min(1, Math.max(0, n * 1.6));
    sum += n * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum / norm;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0 → 1 as `p` crosses `a` → `b`. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

export const smooth = (t: number) => t * t * (3 - 2 * t);

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A bump: 0 outside `a → d`, 1 between `b → c`, smooth ramps either side. */
export function window4(p: number, a: number, b: number, c: number, d: number): number {
  return smooth(seg(p, a, b)) * (1 - smooth(seg(p, c, d)));
}
