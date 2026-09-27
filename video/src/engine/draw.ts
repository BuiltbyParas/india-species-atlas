import { clamp01 } from './ease';
import type { LngLat } from './data';

/**
 * Line and point drawing for the map layers.
 *
 * Every geographic line in the film — a river, a road, a boundary, a thread —
 * goes through `strokeLine`, which can draw a line on by length, so lines grow
 * the way a hand would rule them rather than fading in whole.
 */

export type Pt = [number, number];
export type Projector = (lng: number, lat: number) => Pt | null;

/** Projects a coordinate run, splitting it wherever a point falls off-camera. */
export function projectRun(coords: LngLat[], proj: Projector): Pt[][] {
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (const [lng, lat] of coords) {
    const p = proj(lng, lat);
    if (p) run.push(p);
    else if (run.length) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

export function lengthOf(pts: Pt[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

/** The leading part of a polyline, `k` of the way along by length. */
export function partial(pts: Pt[], k: number): Pt[] {
  if (k >= 1) return pts;
  if (k <= 0 || pts.length < 2) return [];
  const total = lengthOf(pts);
  let want = total * k;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (seg >= want) {
      const f = seg ? want / seg : 0;
      out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
      return out;
    }
    want -= seg;
    out.push(pts[i]);
  }
  return out;
}

/** The point `k` of the way along a polyline. */
export function pointAlong(pts: Pt[], k: number): Pt {
  const p = partial(pts, clamp01(k));
  return p.length ? p[p.length - 1] : pts[0];
}

export interface LineStyle {
  color: string;
  width: number;
  alpha?: number;
  /** A wide soft pass under the line, in the same colour. */
  glow?: number;
  dash?: number[];
  dashOffset?: number;
  cap?: CanvasLineCap;
}

function path(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

export function strokeLine(ctx: CanvasRenderingContext2D, pts: Pt[], style: LineStyle, k = 1) {
  const p = partial(pts, k);
  if (p.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = style.cap ?? 'round';
  if (style.glow) {
    ctx.globalAlpha = (style.alpha ?? 1) * 0.16;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width + style.glow;
    ctx.beginPath();
    path(ctx, p);
    ctx.stroke();
    ctx.globalAlpha = (style.alpha ?? 1) * 0.22;
    ctx.lineWidth = style.width + style.glow * 0.4;
    ctx.stroke();
  }
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  if (style.dash) {
    ctx.setLineDash(style.dash);
    ctx.lineDashOffset = style.dashOffset ?? 0;
  }
  ctx.beginPath();
  path(ctx, p);
  ctx.stroke();
  ctx.restore();
}

/** Strokes many runs as one path — cheap for dense layers like roads. */
export function strokeMany(ctx: CanvasRenderingContext2D, runs: Pt[][], style: LineStyle) {
  if (!runs.length) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = style.color;
  ctx.beginPath();
  for (const r of runs) if (r.length > 1) path(ctx, r);
  if (style.glow) {
    ctx.globalAlpha = (style.alpha ?? 1) * 0.18;
    ctx.lineWidth = style.width + style.glow;
    ctx.stroke();
  }
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.lineWidth = style.width;
  if (style.dash) ctx.setLineDash(style.dash);
  ctx.stroke();
  ctx.restore();
}

/** A locality: a dot, a ring that settles, and an optional pulse. */
export function marker(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, k: number, pulse = -1) {
  if (k <= 0) return;
  const e = clamp01(k);
  ctx.save();
  if (pulse >= 0 && pulse <= 1) {
    ctx.globalAlpha = (1 - pulse) * 0.55 * e;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 6 + pulse * 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = e;
  ctx.fillStyle = 'rgba(14,20,17,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 7.5 * e, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4.2 * e, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = e * 0.7;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, 7.5 + (1 - e) * 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Closed rings as one path, for fills and outlines of states. */
export function ringsPath(ctx: CanvasRenderingContext2D, rings: LngLat[][], proj: Projector) {
  for (const ring of rings) {
    let started = false;
    for (const [lng, lat] of ring) {
      const p = proj(lng, lat);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p[0], p[1]);
        started = true;
      } else ctx.lineTo(p[0], p[1]);
    }
    if (started) ctx.closePath();
  }
}
