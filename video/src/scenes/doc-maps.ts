import { CUES, FEATURED, WORDS } from '../timeline.mjs';
import type { Frame, Scene } from '../engine/film';
import type { LngLat } from '../engine/data';
import { clamp01, easeInOutCubic, easeInOutSine, easeOutCubic, lerp, seg } from '../engine/ease';
import { marker, partial, projectRun, strokeLine, type Projector, type Pt } from '../engine/draw';
import {
  COLORS, clipIndia, densify, drawLines, localities, lookAt, rivers, stateFill, stateLines, terrainPlate, threadRuns, viewAt,
} from '../engine/layers';
import type { Look, View } from '../engine/terrain';
import { INK, SANS, SERIF, STATUS, drawRule, drawText } from '../engine/type';
import { illustrativeTag, placeLabel, sourceNote, species } from './common';
import { POWER_LINE } from './maps';

/**
 * The documentary's map sequences. Each is built only from the atlas's
 * data and the public-domain layers; any drawing device is tagged where it
 * is drawn. Timings come from the narration (`CUES`, `WORDS`, and the
 * shot's own start and end), never from typed-in seconds of the film.
 */

type P = Record<string, any>;
const params = (f: Frame) => ((f.shot as { params?: P }).params ?? {}) as P;
const DOC = 'doc';
void DOC;

const MAP_LOOK: Partial<Look> = { exag: 14, shade: 4.5, outside: 0.14, map: 0.55, fog: 0.004, exposure: 1.05 };

/** Small header, top left, in the atlas's style. */
function header(f: Frame, eyebrow: string, line: string, at: number) {
  drawText(f.ctx, { text: eyebrow, x: 60, y: 84, size: 15, weight: 500, tracking: 0.28, upper: true, color: INK.canvasDim, preset: 'tracking', at, dur: 0.8 }, f.t);
  drawText(f.ctx, { text: line, x: 60, y: 128, size: 38, family: SERIF, weight: 300, italic: true, preset: 'mask', at: at + 0.15, dur: 0.9 }, f.t);
}

/** A card in the site's UI language: forest900 panel, 1 px forest700 stroke, 12 px radius. */
export function uiCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(19,26,22,0.94)';
  ctx.strokeStyle = 'rgba(39,51,44,1)';
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.restore();
}

/** Wraps text into a column, returning the y after the last line. */
function para(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, size: number, color: string, alpha: number, family = SANS, italic = false) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${italic ? 'italic ' : ''}${family === SERIF ? 300 : 400} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.letterSpacing = '0.2px';
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > w && line) {
      ctx.fillText(line, x, y);
      y += size * 1.45;
      line = word;
    } else line = next;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += size * 1.45;
  }
  ctx.restore();
  return y;
}

/** A programme as a record card, every line read from programmes.ts. */
export function programmeCard(f: Frame, id: string, x: number, y: number, at: number, extra?: string) {
  const pr = f.film.assets.programmes.find((p) => p.id === id);
  if (!pr) return;
  const a = easeOutCubic(clamp01((f.t - at) / 0.7));
  if (a <= 0) return;
  const w = 560;
  const { ctx } = f;
  ctx.save();
  ctx.translate(0, (1 - a) * 24);
  uiCard(ctx, x, y, w, 300, a);
  ctx.globalAlpha = a;
  ctx.font = `500 13px ${SANS}`;
  ctx.letterSpacing = '2.6px';
  ctx.fillStyle = INK.forest400;
  ctx.fillText('CONSERVATION PROGRAMME', x + 32, y + 46);
  ctx.textAlign = 'right';
  ctx.fillStyle = INK.canvasDim;
  ctx.fillText(`SINCE ${pr.startedYear}`, x + w - 32, y + 46);
  ctx.textAlign = 'left';
  ctx.restore();
  let yy = para(ctx, pr.name, x + 32, y + 92, w - 64, 26, INK.canvas, a, SERIF);
  yy = para(ctx, extra ?? pr.description, x + 32, yy + 4, w - 64, 15, INK.canvasDim, a);
  para(ctx, pr.authority, x + 32, Math.min(yy + 6, y + 280), w - 64, 13, INK.canvasFaint, a);
}

/* ---------- S007: a network of habitats, cut on each spoken word ---------- */

const HABITATS: Array<{ word: string; view: View; look: Partial<Look>; river?: string[] }> = [
  { word: 'Desert and grassland', view: { lng: 72.9, lat: 25.5, dist: 3.4, heading: 75, pitch: 22 }, look: { exag: 12, warmth: 0.6, fog: 0.09, fogColor: [0.2, 0.17, 0.13], cine: 0.8 } },
  { word: 'Forest', view: { lng: 78.6, lat: 22.3, dist: 2.4, heading: 20, pitch: 28 }, look: { exag: 28, warmth: 0.1, fog: 0.1, fogColor: [0.12, 0.15, 0.13], cine: 0.8, crag: 0.3 } },
  { word: 'River', view: { lng: 83.0, lat: 25.2, dist: 2.6, heading: 80, pitch: 48 }, look: { exag: 20, fog: 0.08, fogColor: [0.12, 0.14, 0.15], map: 0.15, cine: 0.5 }, river: ['Ganges', 'Ghäghara', 'Son'] },
  { word: 'Mountain', view: { lng: 77.35, lat: 31.6, dist: 1.2, heading: 350, pitch: 9, fov: 28 }, look: { exag: 4.2, snow: 1, snowLine: 5050, haze: 0.3, fog: 0.3, fogColor: [0.56, 0.63, 0.71], himalaya: true, cine: 1, crag: 1, sunAzimuth: 105, sunElevation: 9 } },
  { word: 'Floodplain', view: { lng: 93.1, lat: 26.45, dist: 2.2, heading: 15, pitch: 32 }, look: { exag: 16, warmth: 0.25, fog: 0.1, fogColor: [0.17, 0.18, 0.16], cine: 0.6 }, river: ['Brahmaputra'] },
];

export const docHabitats: Scene = (f) => {
  const { ctx, t } = f;
  const n09 = (WORDS as Record<string, number[]>).N09 ?? [0, 2, 3.5, 5, 6.5];
  const base = f.shot.start + 0.13;
  const starts = n09.map((o) => base + o);
  let i = 0;
  while (i < starts.length - 1 && t >= starts[i + 1] - 0.05) i++;
  const h = HABITATS[i];
  const s0 = i === 0 ? f.shot.start : starts[i] - 0.05;
  const s1 = i + 1 < starts.length ? starts[i + 1] - 0.05 : f.shot.end;
  const k = seg(t, s0, s1);
  // Each glide pushes forward a little: the FPV breath of a flight.
  const view = { ...h.view, dist: h.view.dist * (1 - 0.14 * k), heading: h.view.heading + 6 * (k - 0.5) };
  const proj = terrainPlate(f, view, { shade: 4, outside: 0.5, detail: 0.6, exposure: 1.1, sunAzimuth: 290, sunElevation: 20, ...h.look }, '#1c2226');
  if (h.river) drawLines(f, rivers(f, h.river), proj, { color: COLORS.river, width: 2.4, glow: 10, alpha: 0.9 });
  const g = ctx.createLinearGradient(0, f.H * 0.5, 0, f.H);
  g.addColorStop(0, 'rgba(8,12,10,0)');
  g.addColorStop(1, 'rgba(8,12,10,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, f.W, f.H);
  drawText(ctx, { text: h.word, x: 120, y: f.H - 150, size: 104, family: SERIF, weight: 300, tracking: -0.01, preset: 'mask', at: s0 + (i === 0 ? 0.1 : 0), dur: 0.6 }, t);
  drawText(ctx, { text: `${String(i + 1).padStart(2, '0')} / 05`, x: 124, y: f.H - 280, size: 14, weight: 500, tracking: 0.3, color: INK.canvasDim, preset: 'fade', at: s0, dur: 0.4 }, t);
  sourceNote(f, 'Relief: NOAA ETOPO1', 1);
};

/* ---------- S008: the Atlas — twelve species, three layers, five chosen ---------- */

const INDIA_VIEW: View = { lng: 82.6, lat: 22.2, dist: 49, heading: 0, pitch: 90 };

function modeSwitch(f: Frame, active: number, alpha: number) {
  if (alpha <= 0) return;
  const { ctx, W } = f;
  const labels = ['Species', 'Threats', 'Conservation'];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 15px ${SANS}`;
  const widths = labels.map((l) => ctx.measureText(l).width + 36);
  const total = widths.reduce((a, b) => a + b, 0) + 8;
  let x = W - 60 - total;
  const y = 64;
  ctx.fillStyle = 'rgba(19,26,22,0.9)';
  ctx.strokeStyle = 'rgba(39,51,44,1)';
  ctx.beginPath();
  ctx.roundRect(x, y, total, 44, 22);
  ctx.fill();
  ctx.stroke();
  x += 4;
  labels.forEach((l, i) => {
    if (i === active) {
      ctx.fillStyle = 'rgba(232,225,207,0.12)';
      ctx.beginPath();
      ctx.roundRect(x, y + 4, widths[i], 36, 18);
      ctx.fill();
    }
    ctx.fillStyle = i === active ? INK.canvas : INK.canvasFaint;
    ctx.fillText(l, x + 18, y + 28);
    x += widths[i];
  });
  ctx.restore();
}

export const docAtlasLayers: Scene = (f) => {
  const { ctx, t, W } = f;
  const a = f.film.assets;
  const n10 = f.shot.start + 0.4;
  const view = viewAt(t, [[f.shot.start, { ...INDIA_VIEW, dist: 52 }], [f.shot.end, { ...INDIA_VIEW, dist: 46 }]], easeInOutSine);
  const proj = terrainPlate(f, view, MAP_LOOK);
  stateLines(f, proj, { color: 'rgba(232,225,207,0.3)', width: 1 });

  // The three layers of the Atlas map, one after another under N11.
  const n11 = f.shot.start + 5.66;
  const layerAt = [n11, n11 + 1.9, n11 + 3.5];
  const five = f.shot.end - 3.1;
  const dimOthers = clamp01((t - five) / 0.8);
  const mode = t < layerAt[1] ? 0 : t < layerAt[2] ? 1 : 2;
  modeSwitch(f, mode, clamp01((t - layerAt[0] + 0.3) / 0.5) * (1 - dimOthers));

  // Where recorded: every state any species is recorded in.
  const recorded = [...new Set(a.allSpecies.flatMap((s) => s.states))].map((n) => (n === 'Ladakh' ? 'Jammu and Kashmir' : n));
  stateFill(f, proj, recorded, INK.canvas, 0.06 * clamp01((t - layerAt[0]) / 0.6) * (1 - dimOthers));
  // What presses: a hatch over the same ground (threats are recorded per species, not per place).
  const hatch = clamp01((t - layerAt[1]) / 0.6) * (1 - clamp01((t - layerAt[2]) / 0.6));
  if (hatch > 0) {
    ctx.save();
    ctx.beginPath();
    for (const n of recorded) {
      const st = a.stateByName.get(n);
      if (!st) continue;
      for (const ring of st.rings) {
        ring.forEach(([lng, lat], i) => {
          const p = proj(lng, lat);
          if (!p) return;
          if (i === 0) ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        });
      }
    }
    ctx.clip('evenodd');
    ctx.strokeStyle = `rgba(176,122,82,${0.55 * hatch})`;
    ctx.lineWidth = 1.2;
    for (let x = -1200; x < W + 1200; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 1080, 1080);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Every locality in the atlas, species by species, in its category's colour.
  let total = 0;
  a.allSpecies.forEach((s, si) => {
    const featured = FEATURED.includes(s.id);
    s.distributionPoints.forEach((pt, pi) => {
      total++;
      const p = proj(pt.lng, pt.lat);
      if (!p) return;
      const k = clamp01((t - n10 - si * 0.16 - pi * 0.04) / 0.4) * (featured ? 1 : 1 - 0.8 * dimOthers);
      marker(ctx, p[0], p[1], STATUS[s.status].hex, k * 0.9);
      // What protects: rings where the dataset links a programme to the species.
      const prot = clamp01((t - layerAt[2] - si * 0.05) / 0.5) * (1 - dimOthers * (featured ? 0 : 1));
      if (prot > 0 && pi === 0 && s.conservationProgrammes.length) {
        ctx.save();
        ctx.globalAlpha = prot * 0.8;
        ctx.strokeStyle = INK.forest400;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });
  });

  // Five of them: the film's own route through their first localities.
  if (dimOthers > 0) {
    const anchors = FEATURED.map((id: string) => a.species.get(id)!.distributionPoints[0]).map((p) => [p.lng, p.lat] as LngLat);
    const pts = anchors.map(([lng, lat]) => proj(lng, lat)).filter(Boolean) as Pt[];
    const smooth: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2 - (by - ay) * 0.12;
      const my = (ay + by) / 2 + (bx - ax) * 0.12;
      for (let s = 0; s <= 20; s++) {
        const u = s / 20;
        smooth.push([(1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx, (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by]);
      }
    }
    strokeLine(ctx, smooth, { color: INK.canvas, width: 2, glow: 10, alpha: 0.9 }, easeInOutCubic(seg(t, five + 0.2, f.shot.end - 0.3)));
    FEATURED.forEach((id: string, i: number) => {
      const p = pts[i];
      if (!p) return;
      const s = a.species.get(id)!;
      placeLabel(ctx, s.commonName, p, clamp01((t - five - 0.3 - i * 0.25) / 0.4), i % 2 ? -26 : 26, i % 2 ? 24 : -24);
    });
  }

  // The count, computed from the data.
  const countA = clamp01((t - n10) / 0.5);
  if (countA > 0) {
    ctx.save();
    ctx.globalAlpha = countA * (1 - 0.5 * dimOthers);
    ctx.font = `300 120px ${SANS}`;
    ctx.fillStyle = INK.canvas;
    ctx.fillText(String(Math.round(a.allSpecies.length * easeOutCubic(clamp01((t - n10) / 1.2)))), 60, 220);
    ctx.restore();
    drawText(ctx, { text: 'threatened species', x: 64, y: 262, size: 16, weight: 500, tracking: 0.24, upper: true, color: INK.canvasDim, preset: 'tracking', at: n10 + 0.2, dur: 0.8 }, t);
    drawText(ctx, { text: `${total} indicative localities`, x: 64, y: 292, size: 15, weight: 400, tracking: 0.08, color: INK.canvasFaint, preset: 'fade', at: n10 + 0.8, dur: 0.8 }, t);
  }
  drawText(ctx, { text: 'India Species Atlas', x: 60, y: 84, size: 15, weight: 500, tracking: 0.28, upper: true, color: INK.canvasDim, preset: 'tracking', at: f.shot.start + 0.2, dur: 0.8 }, t);
  sourceNote(f, 'All localities, categories and programme links: India Species Atlas dataset · Threats are recorded per species, not per place', clamp01((t - n10 - 1) / 0.6));
};

/* ---------- S011: once across the subcontinent ---------- */

/** Historic range states, each checked against the record's own text before it is drawn. */
const HISTORIC = ['Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Madhya Pradesh'];

export const docBustardRange: Scene = (f) => {
  const { ctx, t } = f;
  const s = species(f, 'great-indian-bustard');
  const historic = HISTORIC.filter((n) => s.indianDistribution.includes(n));
  const view = viewAt(t, [[f.shot.start, { lng: 76.5, lat: 21.5, dist: 30, heading: 0, pitch: 72 }], [f.shot.end, { lng: 72.2, lat: 25.2, dist: 17, heading: -4, pitch: 64 }]], easeInOutCubic);
  const proj = terrainPlate(f, view, { ...MAP_LOOK, warmth: 0.2 });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.25)', width: 1 });
  const lost = f.shot.start + 3.4;
  const onA = clamp01((t - f.shot.start - 0.3) / 0.7);
  const fade = clamp01((t - lost) / 1.4);
  stateFill(f, proj, historic, STATUS.CR.hex, 0.13 * onA * (1 - fade));
  stateLines(f, proj, { color: `rgba(214,69,69,${0.8 * (1 - fade) + 0.25 * fade})`, width: 1.3, dash: fade > 0.5 ? [4, 6] : undefined }, onA, historic);
  stateFill(f, proj, s.states, STATUS.CR.hex, 0.13 * onA);
  stateLines(f, proj, { color: 'rgba(232,225,207,0.85)', width: 1.5 }, onA, s.states);
  localities(f, s.id, proj, lost + 0.8, 0.2);
  drawText(ctx, { text: 'Historic populations — effectively lost or functionally extinct', x: 60, y: 180, size: 17, weight: 400, tracking: 0.02, color: INK.canvasDim, preset: 'fade', at: f.shot.start + 0.8, dur: 0.6, until: lost + 1.2, out: 0.6 }, t);
  header(f, 'Great Indian Bustard', 'Once found across much of the subcontinent', f.shot.start + 0.1);
  // "Low hundreds": the record gives no number, so the film gives none.
  drawText(ctx, { text: 'Low hundreds', x: f.W - 120, y: f.H - 190, size: 76, family: SERIF, weight: 300, align: 'right', preset: 'mask', at: lost + 0.4, dur: 1.0 }, t);
  drawText(ctx, { text: 'Wild population · most in Rajasthan — species.ts, description', x: f.W - 120, y: f.H - 140, size: 14, weight: 500, tracking: 0.14, align: 'right', color: INK.canvasDim, preset: 'fade', at: lost + 0.9, dur: 0.8 }, t);
  sourceNote(f, 'Historic and present range: India Species Atlas (indianDistribution, states of record) · Relief: NOAA ETOPO1', onA);
};

/* ---------- S013: buried lines, hatched eggs ---------- */

export const docBustardResponse: Scene = (f) => {
  const { ctx, t } = f;
  const view = viewAt(t, [[f.shot.start, { lng: 71.0, lat: 25.6, dist: 8.6, heading: 4, pitch: 62 }], [f.shot.end, { lng: 71.2, lat: 25.8, dist: 8.0, heading: 9, pitch: 64 }]], easeInOutSine);
  const proj = terrainPlate(f, view, { exag: 22, shade: 5, warmth: 0.3, outside: 0.22, map: 0.25, fog: 0.035, detail: 0.2, exposure: 1.12, sunAzimuth: 300, sunElevation: 24, fogColor: [0.09, 0.09, 0.075] });
  const s = species(f, 'great-indian-bustard');
  stateLines(f, proj, { color: 'rgba(232,225,207,0.22)', width: 1 });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.7)', width: 1.4 }, 1, s.states);
  // The line goes to ground: solid with pylons, then a buried dotted line.
  const bury = easeInOutCubic(seg(t, f.shot.start + 0.3, f.shot.start + 2.2));
  for (const run of projectRun(POWER_LINE, proj)) {
    strokeLine(ctx, run, { color: INK.canvas, width: 1.6, glow: 8, alpha: 0.9 * (1 - bury) });
    strokeLine(ctx, run, { color: INK.canvas, width: 1.4, alpha: 0.75 * bury, dash: [2, 7] });
  }
  const first = projectRun(POWER_LINE, proj)[0];
  if (first) {
    const p = first[Math.floor(first.length * 0.2)];
    illustrativeTag(ctx, 'Buried or re-routed · illustrative', p[0] + 22, p[1] - 8, clamp01((t - f.shot.start - 1.2) / 0.5));
  }
  localities(f, s.id, proj, f.shot.start, 0.1);
  header(f, 'Great Indian Bustard', 'What protects it', f.shot.start + 0.1);
  programmeCard(f, 'gib-conservation-breeding', f.W - 680, 330, f.shot.start + 3.5);
  sourceNote(f, 'Conservation actions and programme: India Species Atlas (species.ts, programmes.ts)', clamp01((t - f.shot.start - 0.5) / 0.6));
};

/* ---------- S018: islands ---------- */

export const docFragment: Scene = (f) => {
  const { ctx, t, W } = f;
  const t0 = f.shot.start;
  const view = viewAt(t, [[t0, { lng: 79.8, lat: 22.0, dist: 9.3, heading: -12, pitch: 50 }], [f.shot.end, { lng: 79.9, lat: 22.2, dist: 8.2, heading: 10, pitch: 55 }]], easeInOutSine);
  const proj = terrainPlate(f, view, { exag: 26, shade: 5.5, warmth: -0.1, outside: 0.22, map: 0.3, fog: 0.03, detail: 0.3, exposure: 1.05, sunAzimuth: 290, sunElevation: 26, fogColor: [0.06, 0.075, 0.07] });
  const s = species(f, 'bengal-tiger');
  const en = STATUS.EN.hex;
  stateLines(f, proj, { color: 'rgba(232,225,207,0.18)', width: 1 });
  const cutAt = CUES.fragment as number;
  const breakAt = cutAt + 3.2;

  // Reserves as islands: a soft disc at each named reserve (extent illustrative).
  const pts = s.distributionPoints.map((p) => ({ p: proj(p.lng, p.lat), label: p.label.split(',')[0] }));
  for (const { p } of pts) {
    if (!p) continue;
    const g = ctx.createRadialGradient(p[0], p[1], 4, p[0], p[1], 70);
    g.addColorStop(0, 'rgba(80,112,94,0.55)');
    g.addColorStop(1, 'rgba(80,112,94,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 70, 0, Math.PI * 2);
    ctx.fill();
  }
  // The links between them hold, then break where the roads come through.
  const brk = easeInOutCubic(seg(t, breakAt, breakAt + 1.2));
  for (const run of threadRuns(f, s.id)) {
    for (const r of projectRun(densify(run, 0.05), proj)) {
      if (brk <= 0) strokeLine(ctx, r, { color: en, width: 1.6, alpha: 0.85, dash: [6, 7] });
      else {
        const gap = 0.12 * brk;
        strokeLine(ctx, partial(r, 0.5 - gap), { color: en, width: 1.6, alpha: 0.85 * (1 - 0.4 * brk), dash: [6, 7] });
        const tail = partial([...r].reverse(), 0.5 - gap);
        strokeLine(ctx, tail, { color: en, width: 1.6, alpha: 0.85 * (1 - 0.4 * brk), dash: [6, 7] });
      }
    }
  }
  ctx.save();
  clipIndia(f, proj);
  drawLines(f, f.film.assets.roads, proj, { color: COLORS.road, width: 2, glow: 6, alpha: 0.95 }, seg(t, cutAt - 0.2, cutAt + 3.0));
  ctx.restore();
  localities(f, s.id, proj, t0 + 0.2, 0.08);
  pts.forEach(({ p, label }) => {
    if (p && ['Bandhavgarh Tiger Reserve', 'Kanha Tiger Reserve', 'Tadoba–Andhari Tiger Reserve'].includes(label)) placeLabel(ctx, label, p, clamp01((t - t0 - 0.8) / 0.5), 30, -26);
  });

  // HABITAT → FRAGMENTATION → CONNECTIVITY, the last one breaking.
  const words: Array<[string, number]> = [['Habitat', t0 + 0.2], ['Fragmentation', cutAt], ['Connectivity', breakAt]];
  words.forEach(([w, at], i) => {
    const next = words[i + 1]?.[1] ?? f.shot.end;
    if (i < 2) {
      drawText(ctx, { text: w, x: 60, y: 150, size: 72, family: SERIF, weight: 300, preset: 'mask', at, dur: 0.8, until: next - 0.35, out: 0.35 }, t);
      return;
    }
    if (t < at) return;
    const split = easeInOutCubic(seg(t, at + 1.0, at + 2.2));
    ctx.save();
    ctx.font = `300 72px ${SERIF}`;
    ctx.fillStyle = INK.canvas;
    const a = clamp01((t - at) / 0.5);
    const half = Math.floor(w.length / 2);
    const left = w.slice(0, half);
    const lw = ctx.measureText(left).width;
    ctx.globalAlpha = a;
    ctx.fillText(left, 60 - split * 26, 150 + split * 6);
    ctx.fillText(w.slice(half), 60 + lw + split * 40, 150 - split * 4);
    ctx.restore();
  });
  illustrativeTag(ctx, 'Reserve islands and links · illustrative', W - 60, 84, clamp01((t - t0 - 1) / 0.5), 'right');
  sourceNote(f, 'Reserves: India Species Atlas · Roads: Natural Earth 1:10m · Threat: species.ts, threatNote', 1);
};

/* ---------- S023: two river basins, six hundred million people ---------- */

const GANGA_SYSTEM = ['Ganges', 'Yamuna', 'Chambal', 'Ghäghara', 'Gandak', 'Sapt', 'Son', 'Betwa'];
const BRAHMAPUTRA_SYSTEM = ['Brahmaputra', 'Dihang', 'Tista'];

export const docBasins: Scene = (f) => {
  const { ctx, t } = f;
  const t0 = f.shot.start;
  const view = viewAt(t, [[t0, { lng: 85.5, lat: 25.4, dist: 12, heading: 70, pitch: 58 }], [f.shot.end, { lng: 84.5, lat: 24.6, dist: 33, heading: 0, pitch: 76 }]], easeInOutCubic);
  const proj = terrainPlate(f, view, { ...MAP_LOOK, map: 0.4 });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.2)', width: 1 });
  drawLines(f, f.film.assets.rivers.filter((r) => r.rank <= 8), proj, { color: COLORS.river, width: 1, alpha: 0.25 });
  const k = seg(t, t0 + 0.2, t0 + 2.4);
  drawLines(f, rivers(f, GANGA_SYSTEM), proj, { color: COLORS.river, width: 2.2, glow: 10, alpha: 0.95 }, k);
  drawLines(f, rivers(f, BRAHMAPUTRA_SYSTEM), proj, { color: COLORS.river, width: 2.2, glow: 10, alpha: 0.95 }, k);
  const lab = (name: string, lng: number, lat: number) => {
    const p = proj(lng, lat);
    if (p) drawText(ctx, { text: name, x: p[0], y: p[1] - 18, size: 20, family: SERIF, italic: true, weight: 300, align: 'center', color: INK.canvas, preset: 'fade', at: t0 + 1.8, dur: 0.6 }, t);
  };
  lab('Ganga', 84.6, 25.8);
  lab('Brahmaputra', 92.0, 26.6);
  drawText(ctx, { text: '~600 million people', x: f.W - 120, y: f.H - 200, size: 76, family: SERIF, weight: 300, align: 'right', preset: 'mask', at: t0 + 0.4, dur: 1.0 }, t);
  drawText(ctx, { text: 'depend on the Ganga and Brahmaputra basins — species.ts, whyItMatters', x: f.W - 120, y: f.H - 150, size: 14, weight: 500, tracking: 0.12, align: 'right', color: INK.canvasDim, preset: 'fade', at: t0 + 0.9, dur: 0.8 }, t);
  sourceNote(f, 'Rivers: Natural Earth 1:10m (basin extents not drawn) · Relief: NOAA ETOPO1', 1);
};

/* ---------- S024: a programme and its places ---------- */

export const docProgramme: Scene = (f) => {
  const { ctx, t } = f;
  const p = params(f);
  const t0 = f.shot.start;
  const view = viewAt(t, [[t0, { lng: 85.6, lat: 25.6, dist: 7.5, heading: 80, pitch: 55 }], [f.shot.end, { lng: 86.2, lat: 25.5, dist: 6.4, heading: 84, pitch: 57 }]], easeInOutSine);
  const proj = terrainPlate(f, view, { exag: 16, shade: 4.5, warmth: 0.2, outside: 0.22, map: 0.35, fog: 0.035, detail: 0.25, exposure: 1.1, sunAzimuth: 200, sunElevation: 30, fogColor: [0.07, 0.085, 0.09] });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.18)', width: 1 });
  drawLines(f, rivers(f, GANGA_SYSTEM), proj, { color: COLORS.river, width: 2.2, glow: 8, alpha: 0.9 });
  const pts = localities(f, p.species, proj, t0, 0.15);
  pts.forEach((q) => {
    if (q.label.startsWith('Vikramshila')) placeLabel(ctx, q.label, q.p, clamp01((t - t0 - 0.5) / 0.5), 30, -28);
  });
  header(f, species(f, p.species).commonName, 'What protects it', t0 + 0.1);
  programmeCard(f, p.programme, f.W - 680, 330, t0 + 0.6);
  sourceNote(f, 'Programme: India Species Atlas (programmes.ts) · Localities: species.ts · Rivers: Natural Earth', 1);
};

/* ---------- S029: a shrinking alpine world ---------- */

export const docAlpine: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const t0 = f.shot.start;
  const k = easeInOutCubic(seg(t, t0 + 0.4, f.shot.end - 0.3));
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, '#34414f');
  sky.addColorStop(0.7, '#8e9aa3');
  sky.addColorStop(1, '#d6d0c2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  f.film.terrain.setLook({ exag: 4.4, shade: 4, snow: 1, snowLine: lerp(4750, 5500, k), haze: 0.25, fog: 0.28, fogColor: [0.56, 0.63, 0.71], sunAzimuth: 105, sunElevation: 10, exposure: 1.1, warmth: -0.3, himalaya: true, contour: 0.35, contourStep: 250, cine: 1, crag: 1, edge: 0.02, detail: 0.5, outside: 0.5 });
  f.film.terrain.setView({ lng: 77.55, lat: 31.95, dist: 1.1 - 0.06 * k, heading: 0, pitch: 12, fov: 28 });
  f.film.blitTerrain(ctx);
  illustrativeTag(ctx, 'Snow line rising · illustrative, not a projection', W - 60, 84, clamp01((t - t0 - 0.6) / 0.5), 'right');
  drawText(ctx, { text: 'A shrinking alpine zone', x: 60, y: H - 170, size: 64, family: SERIF, weight: 300, preset: 'mask', at: t0 + 0.3, dur: 0.9 }, t);
  drawText(ctx, { text: 'Under climate change — species.ts, threatNote', x: 62, y: H - 124, size: 14, weight: 500, tracking: 0.14, color: INK.canvasDim, preset: 'fade', at: t0 + 0.8, dur: 0.8 }, t);
};

/* ---------- S033: one park ---------- */

export const docKaziranga: Scene = (f) => {
  const { ctx, t } = f;
  const t0 = f.shot.start;
  const view = viewAt(t, [[t0, { lng: 92.6, lat: 26.5, dist: 6, heading: 10, pitch: 52 }], [f.shot.end, { lng: 93.1, lat: 26.6, dist: 3.3, heading: 18, pitch: 55 }]], easeInOutCubic);
  const proj = terrainPlate(f, view, { exag: 12, shade: 5, warmth: 0.05, outside: 0.25, map: 0.3, fog: 0.05, detail: 0.3, exposure: 1.1, fogColor: [0.06, 0.08, 0.075] });
  drawLines(f, rivers(f, ['Brahmaputra', 'Dihang']), proj, { color: COLORS.river, width: 2.4, glow: 10, alpha: 0.9 });
  const s = species(f, 'indian-rhinoceros');
  const pts = localities(f, s.id, proj, t0, 0.1);
  const kaz = pts.find((p) => p.label.startsWith('Kaziranga'));
  const risk = CUES.rhinoRisk as number;
  if (kaz) {
    const grow = easeOutCubic(clamp01((t - t0 - 0.3) / 1.2));
    ctx.save();
    ctx.strokeStyle = STATUS.VU.hex;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(kaz.p[0], kaz.p[1], 14 + 46 * grow, 0, Math.PI * 2);
    ctx.stroke();
    // Each named risk strikes the one place.
    ['Flood', 'Disease', 'Poaching'].forEach((_w, i) => {
      const at = risk + 0.25 + i * 1.25;
      const pulse = seg(t, at, at + 1.1);
      if (pulse > 0 && pulse < 1) {
        ctx.globalAlpha = 1 - pulse;
        ctx.strokeStyle = STATUS.CR.hex;
        ctx.beginPath();
        ctx.arc(kaz.p[0], kaz.p[1], 60 + pulse * 140, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.restore();
    placeLabel(ctx, kaz.label, kaz.p, clamp01((t - t0 - 0.6) / 0.5), 70, -40);
  }
  drawText(ctx, { text: 'More than two-thirds', x: 60, y: f.H - 250, size: 72, family: SERIF, weight: 300, preset: 'mask', at: t0 + 0.4, dur: 1.0, until: risk - 0.2, out: 0.4 }, t);
  drawText(ctx, { text: 'of the world population, in a single park — species.ts, description', x: 62, y: f.H - 200, size: 15, weight: 500, tracking: 0.12, color: INK.canvasDim, preset: 'fade', at: t0 + 0.9, dur: 0.8, until: risk - 0.2, out: 0.4 }, t);
  ['Flood', 'Disease', 'Poaching'].forEach((w, i) => {
    drawText(ctx, { text: w, x: 60 + i * 300, y: f.H - 250, size: 64, family: SERIF, weight: 300, preset: 'mask', at: risk + 0.25 + i * 1.25, dur: 0.6 }, t);
  });
  drawText(ctx, { text: 'Vulnerability of a concentrated range — species.ts, threatNote', x: 62, y: f.H - 200, size: 15, weight: 500, tracking: 0.12, color: INK.canvasDim, preset: 'fade', at: risk + 1.2, dur: 0.8 }, t);
  header(f, s.commonName, 'One park', t0 + 0.1);
  sourceNote(f, 'Localities: India Species Atlas · Rivers: Natural Earth · Relief: NOAA ETOPO1', 1);
};

/* ---------- S034: new populations, and the roads between ---------- */

export const docTranslocation: Scene = (f) => {
  const { ctx, t } = f;
  const t0 = f.shot.start;
  const view = viewAt(t, [[t0, { lng: 92.2, lat: 26.3, dist: 6.2, heading: 0, pitch: 55 }], [f.shot.end, { lng: 92.4, lat: 26.4, dist: 5.4, heading: 8, pitch: 58 }]], easeInOutSine);
  const proj = terrainPlate(f, view, { exag: 12, shade: 5, warmth: 0.25, outside: 0.25, map: 0.3, fog: 0.04, detail: 0.3, exposure: 1.1, fogColor: [0.07, 0.08, 0.07] });
  drawLines(f, rivers(f, ['Brahmaputra', 'Dihang']), proj, { color: COLORS.river, width: 2, glow: 8, alpha: 0.8 });
  const s = species(f, 'indian-rhinoceros');
  const pts = localities(f, s.id, proj, t0, 0.08);
  const at = (name: string) => s.distributionPoints.find((p) => p.label.startsWith(name));
  const manas = at('Manas');
  const roadsAt = t0 + 6.1;
  // Translocations: arcs from Kaziranga and Pobitora to Manas, as the programme describes.
  for (const [i, src] of ['Kaziranga', 'Pobitora'].entries()) {
    const a = at(src);
    if (!a || !manas) continue;
    const pa = proj(a.lng, a.lat);
    const pb = proj(manas.lng, manas.lat);
    if (!pa || !pb) continue;
    const arc: Pt[] = [];
    for (let s2 = 0; s2 <= 40; s2++) {
      const u = s2 / 40;
      arc.push([lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u) - Math.sin(Math.PI * u) * 90]);
    }
    const k = easeInOutCubic(seg(t, t0 + 0.4 + i * 0.4, t0 + 2.4 + i * 0.4));
    strokeLine(ctx, arc, { color: INK.canvas, width: 2, glow: 8, alpha: 0.9 * (1 - 0.5 * clamp01((t - roadsAt) / 0.8)), dash: [8, 6] }, k);
  }
  for (const q of pts) if (['Kaziranga National Park', 'Pobitora Wildlife Sanctuary', 'Manas National Park'].includes(q.label)) placeLabel(ctx, q.label, q.p, clamp01((t - t0 - 0.4) / 0.5), q.label.startsWith('Manas') ? -30 : 30, -28);
  // Top right: clear of Kaziranga's label on the river below.
  programmeCard(f, 'indian-rhino-vision', f.W - 680, 96, t0 + 1.0);
  // Then the roads along the floodplain edge.
  ctx.save();
  clipIndia(f, proj);
  drawLines(f, f.film.assets.roads, proj, { color: COLORS.road, width: 2.2, glow: 8, alpha: 0.95 }, seg(t, roadsAt, roadsAt + 2.2));
  ctx.restore();
  if (t > roadsAt) drawText(ctx, { text: 'Highways between the floodplain and higher ground', x: 60, y: f.H - 170, size: 44, family: SERIF, weight: 300, preset: 'mask', at: roadsAt + 0.3, dur: 0.9 }, t);
  header(f, s.commonName, 'New populations', t0 + 0.1);
  sourceNote(f, 'Translocations: programmes.ts (Indian Rhino Vision 2020) · Roads: Natural Earth (embankments not mapped) · Localities: species.ts', 1);
};

/* ---------- S036: lines drawn to protect ---------- */

/** Programmes linked to the five featured species, from the dataset, oldest first. */
function featuredProgrammes(f: Frame) {
  return f.film.assets.programmes
    .filter((p) => p.speciesIds.some((id) => FEATURED.includes(id)))
    .sort((a, b) => (a.startedYear ?? 0) - (b.startedYear ?? 0));
}

export const docResponse: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const t0 = f.shot.start;
  const proj: Projector = terrainPlate(f, viewAt(t, [[t0, { ...INDIA_VIEW, dist: 50 }], [f.shot.end, { ...INDIA_VIEW, dist: 47 }]]), { ...MAP_LOOK, map: 0.85, exposure: 0.7 });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.22)', width: 1 });
  // Protected places glow: each featured species' localities, ringed.
  FEATURED.forEach((id: string, i: number) => localities(f, id, proj, t0 + 1 + i * 0.3, 0.05, 0.8));
  const shade = ctx.createLinearGradient(0, H * 0.45, 0, H);
  shade.addColorStop(0, 'rgba(8,12,10,0)');
  shade.addColorStop(1, 'rgba(8,12,10,0.8)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  // The timeline is itself a line, ruled from 1970 to 2025.
  const y = H - 250;
  const x0 = 160;
  const x1 = W - 160;
  const pan = -40 * easeInOutSine(seg(t, t0, f.shot.end));
  const X = (year: number) => x0 + ((year - 1970) / (2025 - 1970)) * (x1 - x0) + pan;
  const rule = easeInOutCubic(seg(t, t0 + 0.2, t0 + 2.0));
  ctx.save();
  ctx.fillStyle = 'rgba(232,225,207,0.6)';
  ctx.fillRect(x0 + pan, y, (x1 - x0) * rule, 1.5);
  ctx.font = `500 13px ${SANS}`;
  ctx.fillStyle = INK.canvasFaint;
  for (let yr = 1970; yr <= 2020; yr += 10) {
    if (X(yr) > x0 + pan + (x1 - x0) * rule) continue;
    ctx.fillRect(X(yr), y - 6, 1, 12);
    ctx.fillText(String(yr), X(yr) - 16, y + 30);
  }
  ctx.restore();
  // Programmes appear on the narration's beats: tiger first, then snow leopard, then the rest.
  const beat = (id: string) =>
    id === 'project-tiger' ? t0 + 2.8 : id === 'project-snow-leopard' || id === 'species-recovery-idwh' ? t0 + 6.0 : t0 + 9.8;
  featuredProgrammes(f).forEach((pr, i) => {
    const at = beat(pr.id) + (i % 2) * 0.25;
    const a = easeOutCubic(clamp01((t - at) / 0.6));
    if (a <= 0) return;
    const x = X(pr.startedYear ?? 1970);
    const up = i % 2 === 0;
    const ty = up ? y - 70 - (i % 3) * 58 : y + 64 + (i % 3) * 40;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = INK.canvas;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,225,207,0.4)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, ty + (up ? 8 : -24));
    ctx.stroke();
    ctx.font = `500 14px ${SANS}`;
    ctx.letterSpacing = '1.4px';
    ctx.fillStyle = INK.canvasDim;
    ctx.fillText(String(pr.startedYear), x + 10, ty - 22);
    ctx.font = `300 22px ${SERIF}`;
    ctx.letterSpacing = '0px';
    ctx.fillStyle = INK.canvas;
    const name = pr.name.replace(/ \(.*\)$/, '');
    ctx.fillText(name.length > 44 ? `${name.slice(0, 42)}…` : name, x + 10, ty + 4);
    ctx.restore();
  });
  drawText(ctx, { text: 'The response is geographic too', x: 60, y: 150, size: 64, family: SERIF, weight: 300, preset: 'mask', at: t0 + 0.3, dur: 0.9 }, t);
  drawText(ctx, { text: 'New lines — drawn to protect, rather than divide', x: 62, y: 206, size: 30, family: SERIF, weight: 300, italic: true, color: INK.canvasDim, preset: 'mask', at: t0 + 10.6, dur: 0.9 }, t);
  sourceNote(f, 'Programmes and start years: India Species Atlas (programmes.ts)', clamp01((t - t0 - 1) / 0.6));
};

/* ---------- S037: the Atlas's own closing line ---------- */

export const docClosingLine: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const t0 = f.shot.start;
  const proj = terrainPlate(f, { ...INDIA_VIEW, dist: 47 - 1.5 * seg(t, t0, f.shot.end) }, { ...MAP_LOOK, map: 1, exposure: 0.5 });
  stateLines(f, proj, { color: 'rgba(232,225,207,0.28)', width: 1 });
  const pool = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.5);
  pool.addColorStop(0, 'rgba(10,14,12,0.75)');
  pool.addColorStop(1, 'rgba(10,14,12,0.25)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, W, H);
  drawText(ctx, { text: 'Mapping is not just about where species are.', x: W / 2, y: H / 2 - 20, size: 60, family: SERIF, weight: 300, align: 'center', preset: 'line', at: t0 + 0.35, dur: 1.2 }, t);
  drawText(ctx, { text: 'It is about where we choose to protect them.', x: W / 2, y: H / 2 + 60, size: 60, family: SERIF, weight: 300, italic: true, align: 'center', preset: 'mask', at: t0 + 3.9, dur: 1.2 }, t);
  drawRule(ctx, W / 2 - 40, H / 2 + 130, 80, seg(t, t0 + 5.2, t0 + 5.9), 'rgba(232,225,207,0.4)');
  drawText(ctx, { text: 'India Species Atlas', x: W / 2, y: H / 2 + 170, size: 14, weight: 500, tracking: 0.3, upper: true, align: 'center', color: INK.canvasDim, preset: 'tracking', at: t0 + 5.4, dur: 0.9 }, t);
};

export { lookAt };
