import { CUES, FEATURED } from '../timeline.mjs';
import type { Frame, Scene } from '../engine/film';
import { clamp01, easeInOutCubic, easeOutCubic, seg } from '../engine/ease';
import { projectRun, strokeLine } from '../engine/draw';
import { COLORS, clipIndia, densify, drawLines, localities, stateLines, terrainPlate, threadRuns, viewAt } from '../engine/layers';
import type { View } from '../engine/terrain';
import { INK, SANS, STATUS } from '../engine/type';
import { sourceNote } from './common';

/**
 * S17–S18 share this map. S17: every kind of line in the film on one map of
 * India — rivers, roads, state boundaries, and each species' localities and
 * thread — drawing in, brightening together, then settling as the camera
 * comes to look straight down. S18 (the title) holds on the settled map.
 */

export const CONVERGE_VIEW: Array<[number, View]> = [
  [50.0, { lng: 83.3, lat: 22.3, dist: 40, heading: -12, pitch: 55 }],
  [CUES.settle, { lng: 82.7, lat: 21.9, dist: 50, heading: -1, pitch: 83 }],
  [56.0, { lng: 82.6, lat: 21.5, dist: 51, heading: 0, pitch: 90 }],
  [64.0, { lng: 82.6, lat: 21.5, dist: 48.5, heading: 0, pitch: 90 }],
];

export function convergeMap(f: Frame, quiet: number) {
  const { ctx, t } = f;
  const view = viewAt(t, CONVERGE_VIEW, easeInOutCubic);
  const proj = terrainPlate(f, view, {
    exag: 18 - 8 * clamp01((t - 52) / 4), shade: 4.5, warmth: 0, outside: 0.12,
    map: 0.25 + 0.5 * clamp01((t - 52) / 4) + 0.25 * quiet, fog: 0.004, exposure: 1.08 - 0.5 * quiet,
  });

  // After the convergence the working layers step back.
  const settle = easeInOutCubic(seg(t, CUES.settle, CUES.settle + 1.2));
  const pulse = Math.exp(-Math.pow((t - 53.2) / 0.55, 2));
  const layerA = (1 - 0.6 * settle) * (1 - quiet);

  stateLines(f, proj, { color: `rgba(232,225,207,${0.4 + 0.35 * pulse})`, width: 1 + 0.6 * pulse }, seg(t, 50, 51.3));

  // Roads and rivers are India's lines here, so both stop at its outline.
  ctx.save();
  clipIndia(f, proj);
  drawLines(f, f.film.assets.roads, proj, { color: COLORS.road, width: 1.1, alpha: 0.6 * layerA + 0.3 * pulse * (1 - quiet) }, seg(t, 50.6, 52.1));
  const majorRivers = f.film.assets.rivers.filter((r) => r.rank <= 7);
  drawLines(f, majorRivers, proj, { color: COLORS.river, width: 1.6, glow: 6, alpha: 0.85 * layerA + 0.15 * pulse * (1 - quiet) }, seg(t, 50.3, 51.9));
  ctx.restore();

  // Each species: its thread and its localities, in its category's colour.
  FEATURED.forEach((id: string, i: number) => {
    const s = f.film.assets.species.get(id);
    if (!s) return;
    const at = 51.2 + i * 0.22;
    const color = STATUS[s.status].hex;
    for (const run of threadRuns(f, id)) {
      for (const r of projectRun(densify(run, 0.1), proj)) {
        strokeLine(ctx, r, { color, width: 1.8, alpha: 0.9 * (1 - quiet), dash: [5, 6] }, seg(t, at, at + 0.9));
      }
    }
    localities(f, id, proj, at, 0.05, 1 - quiet);
  });

  // India's outline carries the frame into the title.
  const outline = Math.max(pulse, settle) * 0.9;
  if (outline > 0) stateLines(f, proj, { color: `rgba(232,225,207,${0.18 + 0.2 * outline})`, width: 1.2 }, 1);
  return proj;
}

/** Key, bottom right over the Bay of Bengal, where the map leaves room. */
function legend(f: Frame, alpha: number) {
  if (alpha <= 0) return;
  const { ctx, W, H } = f;
  const rows: Array<[string, string, 'line' | 'dash' | 'dot']> = [
    ['Rivers', COLORS.river, 'line'],
    ['Roads', COLORS.road, 'line'],
    ['State boundaries', INK.canvas, 'line'],
    ['Threads between localities', STATUS.EN.hex, 'dash'],
    [STATUS.CR.label, STATUS.CR.hex, 'dot'],
    [STATUS.EN.label, STATUS.EN.hex, 'dot'],
    [STATUS.VU.label, STATUS.VU.hex, 'dot'],
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 14px ${SANS}`;
  ctx.letterSpacing = '0.6px';
  const x = W - 380;
  let y = H - 90 - rows.length * 28;
  for (const [label, color, kind] of rows) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    if (kind === 'dot') {
      ctx.beginPath();
      ctx.arc(x + 13, y - 5, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      if (kind === 'dash') ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 26, y - 5);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = INK.canvas;
    ctx.fillText(label, x + 40, y);
    y += 28;
  }
  ctx.restore();
}

export const converge: Scene = (f) => {
  convergeMap(f, 0);
  const a = clamp01((f.t - 51.4) / 0.6) * (1 - easeOutCubic(clamp01((f.t - 55.3) / 0.6)));
  legend(f, a);
  sourceNote(f, 'Rivers and roads: Natural Earth · Relief: NOAA ETOPO1 · Boundaries, localities and categories: India Species Atlas', a);
};
