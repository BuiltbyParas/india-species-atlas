import { CUES } from '../films/promo.mjs';
import type { Scene } from '../engine/film';
import { clamp01, easeInOutCubic, hash1, lerp, seg } from '../engine/ease';

/**
 * S06 — the hard cut: a road through forest at dusk, at vehicle height and
 * speed. Then the camera tilts to look straight down, and the centre line is
 * left as one vertical line — which the next shot turns into the real road
 * network. Drawn for the film (illustrative); a footage slot.
 */

interface Cam {
  h: number;
  pitch: number;
  f: number;
}

/** Projects a point on or above the road plane (x across, y up, z ahead). */
function project(cam: Cam, W: number, H: number, x: number, y: number, z: number): [number, number, number] | null {
  const s = Math.sin(cam.pitch);
  const c = Math.cos(cam.pitch);
  const py = y - cam.h;
  const yc = py * c + z * s;
  const zc = -py * s + z * c;
  if (zc <= 0.05) return null;
  return [W / 2 + (cam.f * x) / zc, H / 2 - (cam.f * yc) / zc, zc];
}

export const road: Scene = (f) => {
  const { ctx, t, u, W, H } = f;
  const tilt = easeInOutCubic(seg(t, CUES.roadTilt, 21.7));
  const cam: Cam = { h: lerp(1.3, 9, tilt), pitch: lerp(0.07, Math.PI / 2, tilt), f: 1100 };
  const speed = 26;
  const travel = u * speed;

  // Dusk sky above the treeline, fading as the camera looks down.
  ctx.fillStyle = '#07090a';
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, '#0d1620');
  sky.addColorStop(1, '#3a3a3c');
  ctx.save();
  ctx.globalAlpha = 1 - tilt;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.6);
  ctx.restore();

  // Ground either side, then the asphalt; both run behind the camera too, so
  // the frame is full when the camera looks straight down.
  const horizonY = project(cam, W, H, 0, 0, 2000)?.[1] ?? H / 2;
  const ground = ctx.createLinearGradient(0, horizonY, 0, H);
  ground.addColorStop(0, '#15171a');
  ground.addColorStop(1, '#0b0c0c');
  ctx.fillStyle = ground;
  ctx.fillRect(0, tilt > 0.5 ? 0 : horizonY, W, H);

  const quadAt = (x0: number, x1: number, color: string) => {
    const zs = [-80, -40, -20, -10, -5, -2.5, -1.2, -0.5, 0.2, 2, 8, 30, 120, 800];
    const left: Array<[number, number]> = [];
    const right: Array<[number, number]> = [];
    for (const z of zs) {
      const a = project(cam, W, H, x0, 0, z);
      const b = project(cam, W, H, x1, 0, z);
      if (a && b) {
        left.push([a[0], a[1]]);
        right.push([b[0], b[1]]);
      }
    }
    if (left.length < 2) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    [...left, ...right.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fill();
  };
  const half = 3.6;
  quadAt(-half - 1.2, half + 1.2, '#1b1c1b');
  quadAt(-half, half, '#232424');

  // Headlight pool.
  const pool = ctx.createRadialGradient(W / 2, H * 0.98, 20, W / 2, H * 0.85, W * 0.5);
  pool.addColorStop(0, `rgba(230,210,170,${0.18 * (1 - tilt)})`);
  pool.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, W, H);

  // Edge lines, then the centre dashes rushing past; as the camera tilts
  // down the dashes close into one continuous line.
  ctx.save();
  for (const x of [-half + 0.2, half - 0.2]) {
    const a = project(cam, W, H, x, 0, 0.8);
    const b = project(cam, W, H, x, 0, 800);
    if (a && b) {
      ctx.strokeStyle = `rgba(210,200,170,${0.4 * (1 - tilt)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  const dash = 3;
  const period = 9;
  const solid = clamp01((t - 21.15) / 0.45);
  ctx.strokeStyle = '#e8e1cf';
  ctx.lineCap = 'butt';
  for (let z0 = -60 - (travel % period); z0 < 200; z0 += period) {
    const zA = z0;
    const zB = z0 + lerp(dash, period + 0.05, solid);
    const a = project(cam, W, H, 0, 0, Math.max(zA, -60));
    const b = project(cam, W, H, 0, 0, zB);
    if (!a || !b) continue;
    const near = Math.min(a[2], b[2]);
    ctx.globalAlpha = 0.95 * clamp01(1.5 - near / 140);
    ctx.lineWidth = lerp(Math.min(16, Math.max(2, (0.12 * cam.f) / near)), 4, tilt);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();

  // Forest: a continuous canopy wall on each side, then near trunks flicking past.
  const along = 1 - tilt;
  if (along > 0.01) {
    ctx.save();
    ctx.globalAlpha = along;
    for (const side of [-1, 1]) {
      const pts: Array<[number, number]> = [];
      const baseL: Array<[number, number]> = [];
      for (let z = 1.5; z < 420; z *= 1.06) {
        const wz = z + travel;
        const h = 10 + 6 * (Math.sin(wz * 0.21 + side) * 0.5 + Math.sin(wz * 0.057 + side * 2) * 0.5) + hash1(Math.floor(wz * 0.8) + side * 99) * 3;
        const top = project(cam, W, H, side * (half + 3.4), h, z);
        const bot = project(cam, W, H, side * (half + 3.4), 0, z);
        if (top && bot) {
          pts.push([top[0], top[1]]);
          baseL.push([bot[0], bot[1]]);
        }
      }
      if (pts.length > 2) {
        const g = ctx.createLinearGradient(side < 0 ? 0 : W, 0, W / 2, 0);
        g.addColorStop(0, '#050606');
        g.addColorStop(1, '#1c1f22');
        ctx.fillStyle = g;
        ctx.beginPath();
        [...pts, ...baseL.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.fill();
      }
    }
    // Near trunks.
    ctx.fillStyle = '#040505';
    const spacing = 4.5;
    for (let i = Math.floor(travel / spacing); i < Math.floor(travel / spacing) + 26; i++) {
      for (const side of [-1, 1]) {
        const r = hash1(i * 7.3 + side * 3.1);
        const z = i * spacing - travel + r * 3;
        if (z < 0.6) continue;
        const x = side * (half + 2.2 + r * 1.2);
        const base = project(cam, W, H, x, 0, z);
        const top = project(cam, W, H, x, 16, z);
        if (!base || !top) continue;
        const w = Math.max(1, (0.35 * cam.f) / base[2]);
        ctx.globalAlpha = along * clamp01(1.3 - base[2] / 80);
        ctx.fillRect(base[0] - w / 2, top[1], w, base[1] - top[1]);
      }
    }
    ctx.restore();
  }

  // Speed: a dark vignette pulling at the edges.
  const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.7 * (1 - tilt)})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
};
