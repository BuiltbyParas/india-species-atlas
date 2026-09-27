import { CUES } from '../timeline.mjs';
import type { Scene } from '../engine/film';
import { clamp01, easeInOutQuint, seg } from '../engine/ease';
import { projectRun, strokeLine } from '../engine/draw';
import { densify, lookAt, stateLines, terrainPlate, viewAt } from '../engine/layers';
import { INK, SANS, SERIF, drawText } from '../engine/type';
import { sourceNote } from './common';

/**
 * S03 — the line lands on the ground, and the ground turns out to be India.
 *
 * The shot opens looking straight down on the Thar with a single line across
 * it, at the height the wire held in the shot before. The camera pulls out a
 * thousand kilometres; the state boundaries rule themselves in; the country
 * is named, with its extent read from the boundary file.
 */

/** Degrees as a cartographer writes them: 26°49′N. */
export function formatDeg(value: number, axis: 'lat' | 'lng') {
  const hemi = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const abs = Math.abs(value);
  let deg = Math.floor(abs);
  let min = Math.round((abs - deg) * 60);
  if (min === 60) {
    deg += 1;
    min = 0;
  }
  return `${deg}°${String(min).padStart(2, '0')}′${hemi}`;
}

/** The line from the opening, laid across the Thar near Jaisalmer. A drawing device, not a mapped route. */
export const THAR_LINE = densify([[69.9, 26.97], [70.9, 26.93], [71.95, 26.86]], 0.02);

export const indiaReveal: Scene = (f) => {
  const { ctx, t, W } = f;
  const view = viewAt(t, [
    [7.5, { lng: 70.9, lat: 26.9, dist: 0.95, heading: 0, pitch: 90 }],
    [8.15, { lng: 70.92, lat: 26.89, dist: 0.9, heading: 0, pitch: 90 }],
    [10.6, { lng: 88.2, lat: 21.6, dist: 50, heading: 0, pitch: 74 }],
    [12.6, { lng: 88.4, lat: 21.5, dist: 48.5, heading: 1.5, pitch: 72 }],
  ], easeInOutQuint);
  const look = lookAt(t, [
    [7.5, { exag: 16, shade: 4, warmth: 0.7, outside: 0.5, fog: 0.004, exposure: 1.12, sunAzimuth: 315, sunElevation: 32, fogColor: [0.055, 0.078, 0.067], edge: 0.12 }],
    [10.6, { exag: 18, shade: 4.5, warmth: 0.15, outside: 0.16, fog: 0.005, exposure: 1.12, sunAzimuth: 315, sunElevation: 32, fogColor: [0.055, 0.078, 0.067], edge: 0.12 }],
  ]);
  const proj = terrainPlate(f, view, look);

  // The line: bright while it is the subject, then just a mark on the map.
  const lineA = 1 - 0.75 * clamp01(seg(t, 9.2, 10.4));
  for (const run of projectRun(THAR_LINE, proj)) {
    strokeLine(ctx, run, { color: INK.canvas, width: 2.4, glow: 10, alpha: lineA }, 1);
  }

  // Boundaries rule themselves in as the country comes into view.
  const k = seg(t, 8.7, 10.8);
  stateLines(f, proj, { color: 'rgba(232,225,207,0.55)', width: 1.1 }, k);

  const e = f.film.assets.extent;
  const x = W - 560;
  drawText(ctx, { text: 'India', x, y: 560, size: 170, family: SERIF, weight: 300, tracking: -0.01, preset: 'tracking', at: CUES.indiaReveal, dur: 1.3 }, t);
  drawText(ctx, {
    text: `${formatDeg(e.minLat, 'lat')} – ${formatDeg(e.maxLat, 'lat')}   ${formatDeg(e.minLng, 'lng')} – ${formatDeg(e.maxLng, 'lng')}`,
    x: x + 8, y: 620, size: 17, family: SANS, weight: 500, tracking: 0.2, color: INK.canvasDim, preset: 'line', at: CUES.indiaReveal + 0.5, dur: 1.1,
  }, t);
  sourceNote(f, 'Relief: NOAA ETOPO1 · Boundaries: India Species Atlas', clamp01((t - 10.4) / 0.6));
};
