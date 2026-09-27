import { CUES } from '../timeline.mjs';
import type { Frame, Scene } from '../engine/film';
import type { LngLat } from '../engine/data';
import { clamp01, easeInOutSine, seg } from '../engine/ease';
import { partial, pointAlong, projectRun, strokeLine, type Pt } from '../engine/draw';
import {
  COLORS, clipIndia, densify, drawLines, localities, rivers, stateFill, stateLines, terrainPlate, threadRuns, viewAt,
} from '../engine/layers';
import { INK, SANS, SERIF, STATUS, drawText } from '../engine/type';
import { illustrativeTag, placeLabel, sourceNote, species } from './common';

/**
 * The species maps: where each animal is recorded, and the kind of line that
 * cuts through its ground. Real layers (relief, states of record, localities,
 * roads, rivers) are drawn plainly; anything that is a drawing device is
 * dashed or ticked and carries an "illustrative" tag where it is drawn.
 */

/** Small header, top left: the species in spaced capitals and what the map shows. */
function mapHeader(f: Frame, id: string, line: string, at: number) {
  const s = species(f, id);
  drawText(f.ctx, { text: s.commonName, x: 60, y: 84, size: 15, weight: 500, tracking: 0.28, upper: true, color: INK.canvasDim, preset: 'tracking', at, dur: 0.8 }, f.t);
  drawText(f.ctx, { text: line, x: 60, y: 128, size: 38, family: SERIF, weight: 300, italic: true, preset: 'mask', at: at + 0.15, dur: 0.9 }, f.t);
}

/** Short perpendicular ticks along a line: pylons, or barrages. */
function ticks(ctx: CanvasRenderingContext2D, pts: Pt[], every: number, len: number, color: string, alpha: number) {
  let acc = every / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.5;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, by - ay);
    while (acc <= d) {
      const k = acc / d;
      const x = ax + (bx - ax) * k;
      const y = ay + (by - ay) * k;
      const nx = -(by - ay) / d;
      const ny = (bx - ax) / d;
      ctx.beginPath();
      ctx.moveTo(x - nx * len, y - ny * len);
      ctx.lineTo(x + nx * len, y + ny * len);
      ctx.stroke();
      acc += every;
    }
    acc -= d;
  }
  ctx.restore();
}

/* --- S05: the bustard --- */

/** An illustrative power line across the Thar. No power-line dataset is used; it says so on screen. */
const POWER_LINE: LngLat[] = densify([[72.4, 28.15], [71.6, 27.2], [70.95, 26.55], [70.05, 25.6], [69.2, 24.85]], 0.03);

const bustardMap: Scene = (f) => {
  const { ctx, t } = f;
  const view = viewAt(t, [
    [15.6, { lng: 70.9, lat: 25.2, dist: 10.5, heading: -8, pitch: 58 }],
    [20.4, { lng: 71.0, lat: 25.6, dist: 8.6, heading: 4, pitch: 62 }],
  ], easeInOutSine);
  const proj = terrainPlate(f, view, {
    exag: 22, shade: 5, warmth: 0.45, outside: 0.22, map: 0.2, fog: 0.035, detail: 0.2, exposure: 1.12,
    sunAzimuth: 300, sunElevation: 24, fogColor: [0.09, 0.09, 0.075],
  });
  const cr = STATUS.CR.hex;
  const recorded = species(f, 'great-indian-bustard').states;
  stateLines(f, proj, { color: 'rgba(232,225,207,0.22)', width: 1 });
  stateFill(f, proj, recorded, cr, 0.1 * clamp01((t - 16.3) / 0.7));
  stateLines(f, proj, { color: 'rgba(232,225,207,0.75)', width: 1.4 }, seg(t, 16.3, 17.3), recorded);

  // The illustrative power line, ruled in with its pylons.
  const k = seg(t, 17.4, 18.9);
  for (const run of projectRun(POWER_LINE, proj)) {
    const drawn = partial(run, k);
    strokeLine(ctx, run, { color: INK.canvas, width: 1.6, glow: 8, alpha: 0.9 }, k);
    ticks(ctx, drawn, 34, 5, INK.canvas, 0.8);
  }
  const tagAt = projectRun(POWER_LINE, proj)[0];
  if (tagAt) {
    const p = pointAlong(tagAt, 0.18);
    illustrativeTag(ctx, 'Power line · illustrative', p[0] + 22, p[1] - 8, clamp01((t - 18.2) / 0.5));
  }

  const pts = localities(f, 'great-indian-bustard', proj, CUES.bustardMap + 0.4, 0.3);
  const offsets: Array<[number, number]> = [[-36, 30], [30, -26], [30, 26]];
  pts.forEach((p, i) => placeLabel(ctx, p.label, p.p, clamp01((t - CUES.bustardMap - 0.6 - i * 0.3) / 0.5), ...offsets[i]));

  mapHeader(f, 'great-indian-bustard', 'Where it is recorded', 16.2);
  sourceNote(f, 'States of record and indicative localities: India Species Atlas · Relief: NOAA ETOPO1', clamp01((t - 16.6) / 0.6));
};

/* --- S07: the tiger --- */

const tigerMap: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const view = viewAt(t, [
    [21.75, { lng: 80.25, lat: 22.75, dist: 2.2, heading: 0, pitch: 90 }],
    [22.2, { lng: 80.22, lat: 22.72, dist: 2.5, heading: 0, pitch: 90 }],
    [23.8, { lng: 79.9, lat: 22.1, dist: 10, heading: -18, pitch: 52 }],
    [25.4, { lng: 79.8, lat: 22.0, dist: 9.3, heading: -12, pitch: 50 }],
  ]);
  const proj = terrainPlate(f, view, {
    exag: 26, shade: 5.5, warmth: 0.05, outside: 0.22, map: 0.25, fog: 0.03, detail: 0.3, exposure: 1.1,
    sunAzimuth: 290, sunElevation: 26, fogColor: [0.06, 0.075, 0.07],
  });

  // The road's centre line from the shot before, dissolving into real roads.
  const hold = 1 - clamp01((t - 21.8) / 0.5);
  if (hold > 0) {
    ctx.save();
    ctx.globalAlpha = hold;
    ctx.fillStyle = INK.canvas;
    ctx.fillRect(W / 2 - 2, 0, 4, H);
    ctx.restore();
  }

  stateLines(f, proj, { color: 'rgba(232,225,207,0.2)', width: 1 }, seg(t, 22.4, 23.6));

  // Links between named reserves: the atlas's thread, never more than 5° long.
  const en = STATUS.EN.hex;
  const linkK = seg(t, 23.0, 24.0);
  for (const run of threadRuns(f, 'bengal-tiger')) {
    for (const r of projectRun(densify(run, 0.05), proj)) strokeLine(ctx, r, { color: en, width: 1.3, alpha: 0.8, dash: [6, 7] }, linkK);
  }

  ctx.save();
  clipIndia(f, proj);
  drawLines(f, f.film.assets.roads, proj, { color: COLORS.road, width: 1.7, alpha: 0.9, glow: 5 }, seg(t, CUES.roadsDraw, 23.4));
  ctx.restore();

  const pts = localities(f, 'bengal-tiger', proj, 23.2, 0.12);
  const offsets: Record<string, [number, number]> = {
    'Bandhavgarh Tiger Reserve': [30, -26], 'Kanha Tiger Reserve': [34, 24], 'Tadoba–Andhari Tiger Reserve': [-34, 28],
  };
  pts.forEach((p) => {
    const o = offsets[p.label];
    if (o) placeLabel(ctx, p.label, p.p, clamp01((t - 23.6) / 0.5), ...o);
  });

  illustrativeTag(ctx, 'Links between reserves · illustrative, not corridors', W - 60, 84, clamp01((t - 23.8) / 0.5), 'right');
  mapHeader(f, 'bengal-tiger', 'Roads through tiger country', 22.4);
  sourceNote(f, 'Roads: Natural Earth 1:10m · Reserves: India Species Atlas · Relief: NOAA ETOPO1', clamp01((t - 22.6) / 0.6));
};

/* --- S10: the dolphin --- */

/** The rivers the atlas names for the dolphin, by their Natural Earth names. */
const DOLPHIN_RIVERS = ['Ganges', 'Yamuna', 'Chambal', 'Ghäghara', 'Gandak', 'Sapt', 'Son', 'Brahmaputra', 'Dihang', 'Tista'];

const dolphinMap: Scene = (f) => {
  const { ctx, t } = f;
  const view = viewAt(t, [
    [29.0, { lng: 82.7, lat: 25.35, dist: 3.4, heading: 88, pitch: 60 }],
    [32.9, { lng: 86.6, lat: 25.5, dist: 7.2, heading: 80, pitch: 52 }],
  ], easeInOutSine);
  const proj = terrainPlate(f, view, {
    exag: 16, shade: 4.5, warmth: -0.1, outside: 0.22, map: 0.3, fog: 0.035, detail: 0.25, exposure: 1.1,
    sunAzimuth: 200, sunElevation: 30, fogColor: [0.07, 0.085, 0.09],
  });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.18)', width: 1 });

  const all = f.film.assets.rivers;
  const named = rivers(f, DOLPHIN_RIVERS);
  drawLines(f, all.filter((r) => !named.includes(r)), proj, { color: COLORS.river, width: 1, alpha: 0.25 });

  // The network is revealed downstream, west to east, as the camera follows
  // the Ganga; then the main stem breaks into reaches.
  const front = 80.2 + 11 * easeInOutSine(seg(t, CUES.riversDraw - 0.3, 31.2));
  const brk = easeInOutSine(seg(t, CUES.riverBreak, CUES.riverBreak + 0.7));
  const upTo = (coords: LngLat[]) => {
    const out: LngLat[][] = [];
    let run: LngLat[] = [];
    for (const c of coords) {
      if (c[0] <= front) run.push(c);
      else if (run.length) {
        out.push(run);
        run = [];
      }
    }
    if (run.length > 1) out.push(run);
    return out;
  };
  const ganges = named.filter((r) => r.name === 'Ganges');
  const main = ganges.reduce((a, b) => (b.coords.length > a.coords.length ? b : a), ganges[0]);
  for (const r of named) {
    if (r === main && brk > 0) continue;
    for (const part of upTo(r.coords)) {
      for (const run of projectRun(part, proj)) {
        strokeLine(ctx, run, { color: COLORS.river, width: r.name === 'Ganges' ? 2.6 : 1.7, glow: 9, alpha: 0.95 });
      }
    }
  }
  if (main && brk > 0) {
    // Breaks at even longitudes along the reach in view — a drawing device,
    // deliberately not the positions of real barrages.
    const cuts = [83.9, 85.2, 86.5];
    let reach: LngLat[] = [];
    const reaches: LngLat[][] = [];
    const bars: LngLat[] = [];
    let ci = 0;
    for (const c of main.coords) {
      if (ci < cuts.length && c[0] >= cuts[ci]) {
        reaches.push(reach);
        bars.push(c);
        reach = [];
        ci++;
      }
      reach.push(c);
    }
    reaches.push(reach);
    const gap = 0.06 * brk;
    reaches.forEach((rc, i) => {
      const lo = i > 0 ? cuts[i - 1] + gap : -999;
      const hi = i < cuts.length ? cuts[i] - gap : 999;
      const trimmed = rc.filter((c) => c[0] >= lo && c[0] <= hi);
      for (const run of projectRun(trimmed, proj)) strokeLine(ctx, run, { color: COLORS.river, width: 2.6, glow: 9, alpha: 0.95 });
    });
    bars.forEach((c, i) => {
      const p = proj(c[0], c[1]);
      if (!p) return;
      ctx.save();
      ctx.globalAlpha = brk;
      ctx.strokeStyle = INK.canvas;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] - 11);
      ctx.lineTo(p[0], p[1] + 11);
      ctx.stroke();
      ctx.restore();
      if (i === 1) illustrativeTag(ctx, 'Breaks · illustrative, not barrage positions', p[0] - 150, p[1] + 58, clamp01((t - CUES.riverBreak - 0.3) / 0.5));
    });
  }

  const pts = localities(f, 'ganges-river-dolphin', proj, 30.2, 0.2);
  pts.forEach((p) => {
    if (p.label.startsWith('Vikramshila') || p.label.startsWith('Ganga near Varanasi')) placeLabel(ctx, p.label, p.p, clamp01((t - 30.5) / 0.5), 28, -28);
  });

  mapHeader(f, 'ganges-river-dolphin', 'A river network, divided', 29.8);
  sourceNote(f, 'Rivers: Natural Earth 1:10m · Localities: India Species Atlas · Relief: NOAA ETOPO1', clamp01((t - 30) / 0.6));
};

export const MAPS = new Map<string, Scene>([
  ['map:bustard', bustardMap],
  ['map:tiger', tigerMap],
  ['map:dolphin', dolphinMap],
]);

export { drawText, SANS };
