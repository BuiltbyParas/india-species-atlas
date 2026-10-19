import type { Scene } from '../engine/film';
import { clamp01, hash1, lerp, seg } from '../engine/ease';
import { motes } from './common';

/**
 * S02 — the same wire, far off: a line of transmission towers across open
 * grassland at dawn, the camera tracking sideways past grass in the
 * foreground. Drawn for the film (illustrative); a footage slot.
 */

const HORIZON = 0.66;

/** A lattice tower silhouette standing on the horizon line. */
function tower(ctx: CanvasRenderingContext2D, x: number, base: number, h: number) {
  const w = h * 0.22;
  ctx.save();
  ctx.strokeStyle = '#0d0f0e';
  ctx.lineWidth = Math.max(1, h * 0.012);
  ctx.beginPath();
  // Legs tapering to the waist, then the peak.
  const waist = base - h * 0.62;
  const top = base - h;
  ctx.moveTo(x - w / 2, base);
  ctx.lineTo(x - w * 0.14, waist);
  ctx.lineTo(x, top);
  ctx.lineTo(x + w * 0.14, waist);
  ctx.lineTo(x + w / 2, base);
  // Cross-bracing.
  const levels = 6;
  for (let i = 0; i < levels; i++) {
    const a = base - (h * 0.62 * i) / levels;
    const b = base - (h * 0.62 * (i + 1)) / levels;
    const wa = lerp(w / 2, w * 0.14, i / levels);
    const wb = lerp(w / 2, w * 0.14, (i + 1) / levels);
    ctx.moveTo(x - wa, a);
    ctx.lineTo(x + wb, b);
    ctx.moveTo(x + wa, a);
    ctx.lineTo(x - wb, b);
  }
  // Two crossarms.
  for (const [lv, span] of [[0.7, 0.55], [0.85, 0.42]] as const) {
    const y = base - h * lv;
    ctx.moveTo(x - h * span * 0.5, y);
    ctx.lineTo(x + h * span * 0.5, y);
  }
  ctx.stroke();
  ctx.restore();
}

export const pylons: Scene = (f) => {
  const { ctx, t, u, W, H } = f;
  const hy = H * HORIZON;

  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, '#18222b');
  sky.addColorStop(0.55, '#4d4c4a');
  sky.addColorStop(0.9, '#b58a61');
  sky.addColorStop(1, '#d9a874');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, hy + 2);
  const sun = ctx.createRadialGradient(W * 0.74, hy, 4, W * 0.74, hy, H * 0.55);
  sun.addColorStop(0, 'rgba(255,214,160,0.9)');
  sun.addColorStop(0.08, 'rgba(255,190,130,0.45)');
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Plain: far to near, darkening.
  const ground = ctx.createLinearGradient(0, hy, 0, H);
  ground.addColorStop(0, '#3a3327');
  ground.addColorStop(0.3, '#1f1c16');
  ground.addColorStop(1, '#0c0b09');
  ctx.fillStyle = ground;
  ctx.fillRect(0, hy, W, H - hy);

  // Towers recede to the right; the camera trucks left to right.
  const track = u * 60;
  const towers: Array<{ x: number; h: number; arm: number }> = [];
  for (let i = 0; i < 7; i++) {
    const depth = Math.pow(0.55, i);
    const x = W * 0.16 + (W * 0.72) * (1 - depth) - track * depth;
    towers.push({ x, h: H * 0.95 * depth, arm: depth });
  }
  // Conductors between successive crossarms, sagging.
  ctx.save();
  ctx.strokeStyle = 'rgba(12,12,11,0.9)';
  for (let i = 0; i < towers.length - 1; i++) {
    const a = towers[i];
    const b = towers[i + 1];
    for (const [lv, off] of [[0.7, -0.27], [0.7, 0.27], [0.85, 0]] as const) {
      const ax = a.x + a.h * off;
      const ay = hy - a.h * lv;
      const bx = b.x + b.h * off;
      const by = hy - b.h * lv;
      const sag = Math.hypot(bx - ax, by - ay) * 0.06;
      ctx.lineWidth = Math.max(0.6, 2.2 * a.arm);
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const s = k / 30;
        const x = lerp(ax, bx, s);
        const y = lerp(ay, by, s) + sag * 4 * s * (1 - s);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  // The near span, the wire from the shot before, running off the left edge.
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  const n0 = towers[0];
  ctx.moveTo(-40, H * 0.42);
  ctx.quadraticCurveTo((n0.x - n0.h * 0.27) / 2, H * 0.47, n0.x - n0.h * 0.27, hy - n0.h * 0.7);
  ctx.stroke();
  ctx.restore();
  for (const tw of towers) tower(ctx, tw.x, hy, tw.h);

  // Grass: mid-ground band, then tall foreground blades moving faster.
  const layers: Array<[number, number, number, number, string]> = [
    [0.004, 260, 18, 0.5, '#15130f'],
    [0.012, 140, 70, 1.4, '#090807'],
  ];
  for (const [li, [ybias, count, len, speed, color]] of layers.entries()) {
    ctx.save();
    ctx.strokeStyle = color;
    for (let i = 0; i < count; i++) {
      const r = hash1(i * 13.7 + li * 101);
      const x = (((r * (W + 200) - track * speed * 2.2) % (W + 200)) + W + 200) % (W + 200) - 100;
      const base = li === 0 ? hy + H * ybias * 8 + hash1(i * 3.1) * 40 : H + 10;
      const bl = len * (0.6 + hash1(i * 5.9) * 0.8) * (li === 1 ? 3.4 : 1);
      const sway = Math.sin(t * 1.7 + i * 0.7) * bl * 0.08;
      ctx.lineWidth = li === 1 ? 2 + hash1(i) * 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.quadraticCurveTo(x + sway * 0.4, base - bl * 0.5, x + sway + (hash1(i * 2.3) - 0.5) * bl * 0.3, base - bl);
      ctx.stroke();
    }
    ctx.restore();
  }

  motes(ctx, t, W, H, 60, '#f5d3a4', 0.45 * clamp01(seg(t, 5, 5.6)), [10, -2], 7);
};
