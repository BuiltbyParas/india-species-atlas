import { CUES, FEATURED } from '../films/promo.mjs';
import type { Frame, Scene } from '../engine/film';
import { clamp01, easeOutCubic, noise1, seg } from '../engine/ease';
import { drawPlate } from '../engine/photo';
import { COLORS, localities, rivers, terrainPlate, viewAt, drawLines } from '../engine/layers';
import { INK, SERIF, STATUS, drawText } from '../engine/type';
import { placeLabel, species } from './common';

/**
 * S16 — Kaziranga, then all five in a run of match cuts.
 *
 * First the floodplain where the atlas records most of the world's
 * one-horned rhinos. Then each species flashes past behind one horizontal
 * line that holds its place on screen while it changes character — wire,
 * road, river, contour, protected ground — faster with each cut.
 */

const FOCUS: Record<string, [number, number]> = {
  'great-indian-bustard': [0.62, 0.62],
  'bengal-tiger': [0.34, 0.42],
  'ganges-river-dolphin': [0.62, 0.45],
  'snow-leopard': [0.32, 0.42],
  'indian-rhinoceros': [0.58, 0.55],
};

const LINE_Y = 0.6;

/** The one line, in the character of each species' threat or protection. */
function motif(f: Frame, i: number, alpha: number) {
  const { ctx, W, H, t } = f;
  const y = H * LINE_Y;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath();
  switch (i) {
    case 0: // power line with pylons
      ctx.strokeStyle = INK.canvas;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let x = 60; x < W; x += 160) {
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x, y + 12);
        ctx.stroke();
      }
      break;
    case 1: // road
      ctx.strokeStyle = COLORS.road;
      ctx.lineWidth = 5;
      ctx.setLineDash([46, 28]);
      ctx.lineDashOffset = -t * 900;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      break;
    case 2: // river
      ctx.strokeStyle = COLORS.river;
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.012 + t * 6) * 16 + Math.sin(x * 0.031) * 6);
      ctx.stroke();
      break;
    case 3: // contour
      ctx.strokeStyle = COLORS.clay;
      ctx.lineWidth = 2.4;
      for (let x = 0; x <= W; x += 6) ctx.lineTo(x, y + (noise1(x * 0.01) - 0.5) * 70 + (noise1(x * 0.05 + 3) - 0.5) * 16);
      ctx.stroke();
      break;
    case 4: // protected ground: the line and a ring
      ctx.strokeStyle = INK.canvas;
      ctx.moveTo(0, y);
      ctx.lineTo(W / 2 - 42, y);
      ctx.moveTo(W / 2 + 42, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, y, 42, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

export const montage: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const cuts = CUES.montage as number[];

  if (t < cuts[0]) {
    // Kaziranga on the Brahmaputra floodplain.
    const view = viewAt(t, [
      [47.5, { lng: 93.05, lat: 26.45, dist: 3.4, heading: 12, pitch: 52 }],
      [48.5, { lng: 93.15, lat: 26.55, dist: 3.0, heading: 18, pitch: 55 }],
    ]);
    const proj = terrainPlate(f, view, { exag: 12, shade: 5, warmth: 0.1, outside: 0.25, map: 0.25, fog: 0.05, detail: 0.3, exposure: 1.12, fogColor: [0.06, 0.08, 0.075] });
    drawLines(f, rivers(f, ['Brahmaputra', 'Dihang']), proj, { color: COLORS.river, width: 2.4, glow: 10, alpha: 0.95 });
    const pts = localities(f, 'indian-rhinoceros', proj, 47.55, 0.08);
    const kaz = pts.find((p) => p.label.startsWith('Kaziranga'));
    const s = species(f, 'indian-rhinoceros');
    const note = s.distributionPoints.find((p) => p.label.startsWith('Kaziranga'))?.note ?? '';
    if (kaz) {
      placeLabel(ctx, kaz.label, kaz.p, clamp01((t - 47.7) / 0.3), 34, -30);
      drawText(ctx, { text: note, x: kaz.p[0] + 42, y: kaz.p[1] + 2, size: 22, family: SERIF, italic: true, weight: 300, color: INK.canvasDim, preset: 'fade', at: 47.85, dur: 0.35 }, t);
    }
    return;
  }

  // The five, faster each time.
  let i = 0;
  while (i < cuts.length - 1 && t >= cuts[i + 1]) i++;
  const start = cuts[i];
  const end = i + 1 < cuts.length ? cuts[i + 1] : 50;
  const k = seg(t, start, end);
  const id = FEATURED[i];
  const lastOut = i === cuts.length - 1 ? clamp01((t - (end - 0.12)) / 0.12) : 0;

  ctx.fillStyle = '#0e1411';
  ctx.fillRect(0, 0, W, H);
  drawPlate(ctx, f.film.assets.photos.get(id), W, H, {
    u: k, d: 1, focus: FOCUS[id], zoom: [1.34, 1.42], filter: 'saturate(0.8) contrast(1.06) brightness(0.9)', alpha: 1 - lastOut,
  });
  // A flash on each cut, a breath of light rather than a white frame.
  const flash = 1 - easeOutCubic(clamp01((t - start) / 0.08));
  if (flash > 0) {
    ctx.fillStyle = `rgba(232,225,207,${0.35 * flash})`;
    ctx.fillRect(0, 0, W, H);
  }
  // Darken around the line so it reads over any photograph.
  const band = ctx.createLinearGradient(0, H * (LINE_Y - 0.2), 0, H * (LINE_Y + 0.2));
  band.addColorStop(0, 'rgba(8,12,10,0)');
  band.addColorStop(0.5, 'rgba(8,12,10,0.45)');
  band.addColorStop(1, 'rgba(8,12,10,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, H);
  motif(f, i, 1);
  // The category chip rides the line's left end.
  ctx.fillStyle = STATUS[species(f, id).status].hex;
  ctx.fillRect(60, H * LINE_Y - 34, 14, 14);
};
