import { CUES } from '../films/promo.mjs';
import type { Scene } from '../engine/film';
import { clamp01, easeInOutCubic, easeOutCubic, hash1, lerp, seg } from '../engine/ease';
import { motes } from './common';

/**
 * S01 — the hook. A power-line conductor in macro against a dusk sky, the
 * light running along its strands; then it pulls taut, loses its thickness
 * and its sky, and is left as a single thin line: a line on a map.
 *
 * Drawn for the film (illustrative), and a footage slot: a real macro of a
 * conductor dropped at video/public/footage/S01.mp4 replaces it.
 */

/** A conductor between two screen points, sagging by `sag` px at mid-span. */
function catenary(x0: number, y0: number, x1: number, y1: number, sag: number, n = 64): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([lerp(x0, x1, k), lerp(y0, y1, k) + sag * 4 * k * (1 - k)]);
  }
  return pts;
}

function strokePath(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

export const cable: Scene = (f) => {
  const { ctx, t, W, H } = f;
  const flat = easeInOutCubic(seg(t, CUES.lineFlatten, 4.95));
  const light = easeOutCubic(seg(t, 0.15, 2.2)) * (1 - flat);

  // Dusk sky, gone to the map's near-black as the line flattens.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0b1116');
  sky.addColorStop(0.55, '#2a2a2b');
  sky.addColorStop(0.85, '#6a4d35');
  sky.addColorStop(1, '#8a5f3c');
  ctx.fillStyle = '#0e1411';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = light;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // A low sun off frame, bottom right.
  const sun = ctx.createRadialGradient(W * 0.86, H * 1.05, 20, W * 0.86, H * 1.05, H * 0.95);
  sun.addColorStop(0, 'rgba(255,196,130,0.55)');
  sun.addColorStop(0.4, 'rgba(210,140,80,0.18)');
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Slow handheld drift.
  const dx = Math.sin(t * 0.7) * 6 + t * 5;
  const dy = Math.cos(t * 0.5) * 4;

  // Out-of-focus conductors behind and in front, for depth.
  ctx.save();
  ctx.globalAlpha = 0.5 * light;
  ctx.filter = 'blur(7px)';
  ctx.strokeStyle = '#161514';
  ctx.lineWidth = 9;
  strokePath(ctx, catenary(-100 + dx * 0.5, H * 0.2 + dy, W + 100 + dx * 0.5, H * 0.3 + dy, 90));
  ctx.filter = 'blur(22px)';
  ctx.globalAlpha = 0.85 * light;
  ctx.lineWidth = 70;
  ctx.strokeStyle = '#070707';
  strokePath(ctx, catenary(-200 + dx * 1.6, H * 0.86 + dy * 2, W + 200 + dx * 1.6, H * 0.97 + dy * 2, 70));
  ctx.restore();

  // The conductor. Thick and sagging in macro; thin and straight as a map line.
  const thick = lerp(64, 2.4, flat);
  const sag = lerp(150, 0, flat);
  const y0 = lerp(H * 0.22, H * 0.415, flat) + dy * (1 - flat);
  const y1 = lerp(H * 0.36, H * 0.445, flat) + dy * (1 - flat);
  const pts = catenary(-60 + dx * (1 - flat), y0, W + 60 + dx * (1 - flat), y1, sag);
  const reveal = clamp01(seg(t, 0.2, 1.4));

  ctx.save();
  ctx.lineCap = 'round';
  // Body: dark aluminium, lit from below by the low sun.
  ctx.globalAlpha = reveal;
  ctx.strokeStyle = flat > 0.5 ? '#e8e1cf' : '#1d1b19';
  ctx.lineWidth = thick;
  strokePath(ctx, pts);
  if (flat < 0.98) {
    // Rim light along the lower edge.
    ctx.globalAlpha = reveal * (1 - flat) * 0.9;
    ctx.strokeStyle = '#e0ad74';
    ctx.lineWidth = Math.max(1, thick * 0.14);
    strokePath(ctx, pts.map(([x, y]) => [x, y + thick * 0.36] as [number, number]));
    ctx.globalAlpha = reveal * (1 - flat) * 0.35;
    ctx.strokeStyle = '#6a4a30';
    ctx.lineWidth = Math.max(1, thick * 0.3);
    strokePath(ctx, pts.map(([x, y]) => [x, y + thick * 0.2] as [number, number]));
    // The lay of the strands: short diagonal highlights along the conductor.
    ctx.lineWidth = Math.max(1, thick * 0.07);
    const period = thick * 0.55;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      for (let s = 0; s < len; s += period) {
        const x = ax + ux * s;
        const y = ay + uy * s;
        // Glint travelling along the wire, then settling.
        const along = x / W;
        const glint = Math.exp(-Math.pow((along - (t - CUES.cableLight) * 0.45) / 0.12, 2));
        const a = (0.12 + 0.55 * glint) * (0.6 + 0.4 * hash1(Math.floor(x / period)));
        ctx.globalAlpha = reveal * (1 - flat) * a;
        ctx.strokeStyle = glint > 0.3 ? '#ffd9a8' : '#b58a5f';
        ctx.beginPath();
        ctx.moveTo(x - ux * thick * 0.2 - uy * thick * 0.4, y - uy * thick * 0.2 + ux * thick * 0.4);
        ctx.lineTo(x + ux * thick * 0.2 + uy * thick * 0.25, y + uy * thick * 0.2 - ux * thick * 0.25);
        ctx.stroke();
      }
    }
  }
  if (flat > 0) {
    // The map line's glow.
    ctx.globalAlpha = flat * 0.25;
    ctx.strokeStyle = '#e8e1cf';
    ctx.lineWidth = 10;
    strokePath(ctx, pts);
  }
  ctx.restore();

  motes(ctx, t, W, H, 90, '#f3d6ae', 0.55 * light, [6, -3], 3);
};
