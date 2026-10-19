import type { Frame } from './film';
import type { GeoLine, LngLat } from './data';
import { clamp01, easeInOutCubic, lerp, seg } from './ease';
import { marker, partial, projectRun, ringsPath, strokeLine, strokeMany, type LineStyle, type Projector, type Pt } from './draw';
import type { Look, View } from './terrain';
import { STATUS } from './type';

/**
 * Map layers drawn over the terrain: every one of them is projected through
 * the terrain camera, so a river drawn in 2D sits on the relief it runs
 * through.
 */

export const COLORS = {
  canvas: '#e8e1cf',
  river: '#8fb8cc',
  road: '#c98d5f',
  clay: '#b07a52',
  border: 'rgba(232,225,207,0.5)',
};

/** Camera keyframes: each field eases between keys; heading takes the short way round. */
export function viewAt(t: number, keys: Array<[number, View]>, ease = easeInOutCubic): View {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = ease(seg(t, t0, t1));
      let dh = v1.heading - v0.heading;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      return {
        lng: lerp(v0.lng, v1.lng, k),
        lat: lerp(v0.lat, v1.lat, k),
        // Distance eases in log space, so a long pull-out feels even.
        dist: Math.exp(lerp(Math.log(v0.dist), Math.log(v1.dist), k)),
        heading: v0.heading + dh * k,
        pitch: lerp(v0.pitch, v1.pitch, k),
        fov: lerp(v0.fov ?? 35, v1.fov ?? 35, k),
      };
    }
  }
  return keys[keys.length - 1][1];
}

export function lookAt(t: number, keys: Array<[number, Partial<Look>]>, ease = easeInOutCubic): Partial<Look> {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, b] = keys[i];
    if (t <= t1) {
      const [t0, a] = keys[i - 1];
      const k = ease(seg(t, t0, t1));
      const out: Record<string, unknown> = { ...a, ...b };
      for (const key of Object.keys(b) as Array<keyof Look>) {
        const va = a[key];
        const vb = b[key];
        if (typeof va === 'number' && typeof vb === 'number') out[key] = lerp(va, vb, k);
        if (Array.isArray(va) && Array.isArray(vb)) out[key] = va.map((x, j) => lerp(x as number, vb[j] as number, k));
      }
      return out as Partial<Look>;
    }
  }
  return keys[keys.length - 1][1];
}

/** Sets the terrain up for this frame, fills the background and draws the relief. */
export function terrainPlate(f: Frame, view: View, look: Partial<Look>, background = '#0e1411') {
  const { ctx, W, H } = f;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);
  f.film.terrain.setLook(look);
  f.film.terrain.setView(view);
  f.film.blitTerrain(ctx);
  return (lng: number, lat: number) => f.film.terrain.project(lng, lat, 0.0015);
}

/** Every state boundary, drawn on by length together. */
export function stateLines(f: Frame, proj: Projector, style: LineStyle, k = 1, names?: string[]) {
  const { ctx } = f;
  for (const s of f.film.assets.states) {
    if (names && !names.includes(s.name)) continue;
    for (const ring of s.rings) {
      for (const run of projectRun(ring, proj)) {
        // Islands a few pixels across only scribble at this scale.
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [x, y] of run) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        if (x1 - x0 < 14 && y1 - y0 < 14) continue;
        strokeLine(ctx, run, style, k);
      }
    }
  }
}

export function stateFill(f: Frame, proj: Projector, names: string[], color: string, alpha: number) {
  if (alpha <= 0) return;
  const { ctx } = f;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const n of names) {
    const s = f.film.assets.stateByName.get(n);
    if (s) ringsPath(ctx, s.rings, proj);
  }
  ctx.fill('evenodd');
  ctx.restore();
}

/** Clips following drawing to India's outline. */
export function clipIndia(f: Frame, proj: Projector) {
  const { ctx } = f;
  ctx.beginPath();
  for (const s of f.film.assets.states) ringsPath(ctx, s.rings, proj);
  ctx.clip('nonzero');
}

export function runsOf(lines: GeoLine[], proj: Projector): Pt[][] {
  return lines.flatMap((l) => projectRun(l.coords, proj));
}

export function drawLines(f: Frame, lines: GeoLine[], proj: Projector, style: LineStyle, k = 1) {
  if (k >= 1) {
    strokeMany(f.ctx, runsOf(lines, proj), style);
    return;
  }
  for (const l of lines) for (const run of projectRun(l.coords, proj)) strokeLine(f.ctx, run, style, k);
}

/** Rivers by Natural Earth name. */
export function rivers(f: Frame, names: string[]): GeoLine[] {
  return f.film.assets.rivers.filter((r) => r.name && names.includes(r.name));
}

/**
 * A species' indicative localities from the atlas's data, each appearing in
 * turn; returns their screen positions for labels.
 */
export function localities(f: Frame, id: string, proj: Projector, at: number, stagger = 0.22, fade = 1): Array<{ p: Pt; label: string; k: number }> {
  const s = f.film.assets.species.get(id);
  if (!s) return [];
  const color = STATUS[s.status].hex;
  const out: Array<{ p: Pt; label: string; k: number }> = [];
  s.distributionPoints.forEach((pt, i) => {
    const p = proj(pt.lng, pt.lat);
    if (!p) return;
    const k = clamp01((f.t - at - i * stagger) / 0.5) * fade;
    const pulse = ((f.t - at - i * stagger) % 2.2) / 2.2;
    marker(f.ctx, p[0], p[1], color, k, k > 0 ? pulse : -1);
    out.push({ p, label: pt.label.split(',')[0], k });
  });
  return out;
}

/**
 * The atlas's "thread": a line through a species' localities, drawn only
 * between points in the same landscape (never more than 5° apart), exactly
 * as the home page draws it — a reading device, not a corridor.
 */
export function threadRuns(f: Frame, id: string): LngLat[][] {
  const s = f.film.assets.species.get(id);
  if (!s) return [];
  const pts = s.distributionPoints.map((p) => [p.lng, p.lat] as LngLat);
  const runs: LngLat[][] = [];
  let run: LngLat[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 5) run.push(b);
    else {
      if (run.length > 1) runs.push(run);
      run = [b];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** Densifies a lng/lat run so a projected line follows the relief rather than cutting through it. */
export function densify(run: LngLat[], step = 0.05): LngLat[] {
  const out: LngLat[] = [];
  for (let i = 0; i < run.length - 1; i++) {
    const [a, b] = [run[i], run[i + 1]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < n; j++) out.push([lerp(a[0], b[0], j / n), lerp(a[1], b[1], j / n)]);
  }
  out.push(run[run.length - 1]);
  return out;
}

export { partial };
