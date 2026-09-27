import { CUES } from '../timeline.mjs';
import type { Scene } from '../engine/film';
import { clamp01, easeInOutCubic, hash1, seg } from '../engine/ease';
import { localities, lookAt, stateFill, stateLines, viewAt } from '../engine/layers';
import { INK, SERIF, STATUS, drawText } from '../engine/type';
import { placeLabel, sourceNote, species } from './common';

/**
 * S12–S13 — the snow leopard's ground, as one continuous camera move.
 *
 * Low over the ridges of Spiti and Lahaul in cold morning haze; contour
 * lines at a real 250 m interval rise out of the relief; the camera lifts
 * to look straight down and the contours become the map, where the states
 * of record and localities come in. S12 and S13 share this scene so the cut
 * between them is invisible.
 */

const VIEW = [
  [35.0, { lng: 77.3, lat: 31.5, dist: 1.25, heading: 346, pitch: 8, fov: 28 }],
  [38.3, { lng: 77.4, lat: 31.82, dist: 1.0, heading: 351, pitch: 10.5, fov: 28 }],
  [40.3, { lng: 77.9, lat: 32.1, dist: 3.6, heading: 358, pitch: 72, fov: 32 }],
  [42.3, { lng: 81.4, lat: 30.6, dist: 15.5, heading: 0, pitch: 88, fov: 35 }],
] as const;

export const himalaya: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const view = viewAt(t, VIEW.map(([k, v]) => [k, { ...v }]), easeInOutCubic);

  const cold: [number, number, number] = [0.56, 0.63, 0.71];
  const dark: [number, number, number] = [0.055, 0.078, 0.067];
  const look = lookAt(t, [
    [35.0, { exag: 4.2, shade: 4, snow: 1, snowLine: 5050, haze: 0.3, fog: 0.3, fogColor: cold, sunAzimuth: 105, sunElevation: 9, exposure: 1.1, warmth: -0.3, himalaya: true, contour: 0, contourStep: 250, map: 0, outside: 0.5, detail: 0.5, edge: 0.02, cine: 1, crag: 1 }],
    [CUES.contours, { exag: 4.4, snow: 1, haze: 0.28, fog: 0.27, fogColor: cold, contour: 0, contourStep: 250, cine: 1, crag: 1 }],
    [CUES.contourMap, { exag: 4.4, snow: 0.2, haze: 0.05, fog: 0.08, contour: 0.85, contourStep: 250, map: 0.25, cine: 0.6, crag: 0.5 }],
    [40.4, { exag: 5, snow: 0.1, haze: 0, fog: 0.012, fogColor: dark, contour: 0.7, contourStep: 500, map: 0.6, outside: 0.25, warmth: 0, detail: 0.2, edge: 0.06, cine: 0, crag: 0 }],
    [42.3, { exag: 7, snow: 0, haze: 0, fog: 0.004, fogColor: dark, contour: 0.55, contourStep: 500, map: 0.8, outside: 0.18, warmth: 0, cine: 0, crag: 0 }],
  ]);

  // Sky: pale and cold at the horizon, gone once the camera looks down.
  const skyA = 1 - clamp01((t - 39.3) / 1.2);
  const bg = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  bg.addColorStop(0, '#34414f');
  bg.addColorStop(0.7, '#8e9aa3');
  bg.addColorStop(1, '#d6d0c2');
  ctx.fillStyle = '#0e1411';
  ctx.fillRect(0, 0, W, H);
  if (skyA > 0) {
    ctx.save();
    ctx.globalAlpha = skyA;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // The relief goes straight over the sky (not through terrainPlate, which fills its own background).
  f.film.terrain.setLook(look);
  f.film.terrain.setView(view);
  f.film.blitTerrain(ctx);
  const proj = (lng: number, lat: number) => f.film.terrain.project(lng, lat, 0.0015);

  // Falling snow, thinning as the camera climbs out of it.
  const snowA = 1 - clamp01((t - 38.6) / 1.4);
  if (snowA > 0) {
    ctx.save();
    ctx.fillStyle = '#eef2f4';
    for (let i = 0; i < 260; i++) {
      const depth = 0.25 + hash1(i * 5.3) * 0.75;
      const speed = 40 + depth * 90;
      const x = ((hash1(i * 2.1) * W + Math.sin(t * 0.6 + i) * 18 * depth + (t - 35) * 30 * depth) % W + W) % W;
      const y = ((hash1(i * 7.7) * H + (t - 35) * speed) % H + H) % H;
      ctx.globalAlpha = snowA * (0.25 + 0.55 * depth);
      ctx.beginPath();
      ctx.arc(x, y, 0.6 + depth * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Once the contours have become the map: where the snow leopard is recorded.
  const s = species(f, 'snow-leopard');
  const vu = STATUS.VU.hex;
  // The boundary file predates 2019, so Ladakh is recorded on the J&K shape.
  const recorded = s.states.map((n) => (n === 'Ladakh' ? 'Jammu and Kashmir' : n));
  const mapK = clamp01((t - 40.2) / 0.8);
  if (mapK > 0) {
    stateLines(f, proj, { color: 'rgba(232,225,207,0.2)', width: 1 }, mapK);
    stateFill(f, proj, recorded, vu, 0.1 * mapK);
    stateLines(f, proj, { color: 'rgba(232,225,207,0.7)', width: 1.3 }, seg(t, 40.4, 41.4), recorded);
    const pts = localities(f, 'snow-leopard', proj, 40.8, 0.15);
    pts.forEach((p, i) => placeLabel(ctx, p.label, p.p, clamp01((t - 41.0 - i * 0.12) / 0.5), i % 2 ? -30 : 30, i % 2 ? 26 : -24));
    drawText(ctx, { text: s.commonName, x: 60, y: 84, size: 15, weight: 500, tracking: 0.28, upper: true, color: INK.canvasDim, preset: 'tracking', at: 40.4, dur: 0.8 }, t);
    drawText(ctx, { text: 'Contours every 500 m', x: 60, y: 128, size: 38, family: SERIF, weight: 300, italic: true, preset: 'mask', at: 40.55, dur: 0.9 }, t);
    sourceNote(f, 'Relief and contours: NOAA ETOPO1 · States of record and localities: India Species Atlas · Ladakh drawn on the older J&K boundary', mapK);
  }

  // A thin band of valley haze low in frame while the camera is in the mountains.
  if (skyA > 0) {
    const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
    g.addColorStop(0, 'rgba(200,210,216,0)');
    g.addColorStop(1, `rgba(200,210,216,${0.18 * skyA})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
};
